import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, ...(status === 429 ? { "Retry-After": "60" } : {}) } });
// Best-effort per-isolate throttling. It slows bursts but is NOT a substitute for an edge/WAF rate limit.
const rateBuckets = new Map<string, { start: number; count: number }>();
function rateLimited(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  let current = rateBuckets.get(key);
  if (!current && rateBuckets.size >= 5000) {
    for (const [k, v] of rateBuckets) if (now - v.start >= windowMs) rateBuckets.delete(k);
    if (rateBuckets.size >= 5000) {
      const oldestKey = rateBuckets.keys().next().value;
      if (oldestKey !== undefined) rateBuckets.delete(oldestKey);
    }
  }
  current = rateBuckets.get(key);
  if (!current || now - current.start >= windowMs) rateBuckets.set(key, { start: now, count: 1 });
  else { current.count++; if (current.count > limit) return true; }
  return false;
}
const b64url = (value: string) => btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromB64url = (value: string) => atob(value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4));

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey("raw", new TextEncoder().encode(secret + ":imposed-listener-session-v1"), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function issueSession(secret: string) {
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, scope: "public-artist-discovery" }));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(payload));
  return payload + "." + b64url(String.fromCharCode(...new Uint8Array(signature)));
}
async function validSession(secret: string, token: unknown) {
  if (typeof token !== "string" || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const signature = Uint8Array.from(fromB64url(parts[1]), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), signature, new TextEncoder().encode(parts[0]));
    if (!valid) return false;
    const payload = JSON.parse(fromB64url(parts[0]));
    return payload.scope === "public-artist-discovery" && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
async function persistentRateLimited(ip: string, scope: string, limit: number, windowSeconds = 60) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Request protection is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const response = await fetch(`${url}/rest/v1/rpc/consume_public_rate_limit`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_bucket_key: `${hash}:${scope}`, p_limit: limit, p_window_seconds: windowSeconds }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Request protection is temporarily unavailable");
  return (await response.json()) === true;
}
async function dbGet(path: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server data access is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Public artist data could not be loaded");
  return await response.json();
}
const truthy = (v: unknown, fallback = true) => v == null ? fallback : String(v) === "true";
const boundedText = (value: unknown, max: number, fallback = "") => typeof value === "string" ? value.trim().slice(0, max) : fallback;
function safePublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 512) return null;
  try {
    const raw = value.trim();
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch { return null; }
}
function publicLinks(value: unknown, maxItems = 16): { label: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).flatMap((item: any) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const url = safePublicUrl(item.url);
    if (!url) return [];
    return [{ label: boundedText(item.label, 60, "Link") || "Link", url }];
  });
}
function publicStreamingLinks(value: unknown): { label: string; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item: any) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const url = safePublicUrl(item.url);
    if (!url) return [];
    return [{ label: boundedText(item.label, 40, "Listen") || "Listen", url }];
  });
}
async function readBoundedBody(req: Request, maxBytes: number): Promise<string | null> {
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ success: false, error: "Method not allowed" }, 405);
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return reply({ success: false, error: "Content-Type must be application/json." }, 415);
  const clientIp = (req.headers.get("CF-Connecting-IP") || "unknown").slice(0, 80);
  if (rateLimited(`ip:${clientIp}`, 30)) return reply({ success: false, error: "Too many requests. Please wait a minute and try again." }, 429);
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return reply({ success: false, error: "Visitor verification is not configured yet. Please try again later." }, 503);
  try {
    let rawBody: string | null;
    try { rawBody = await readBoundedBody(req, 8192); }
    catch { return reply({ success: false, error: "Request body must be valid UTF-8." }, 400); }
    if (rawBody === null) return reply({ success: false, error: "Request body is too large." }, 413);
    let body: any;
    try { body = JSON.parse(rawBody); } catch { return reply({ success: false, error: "Invalid JSON body." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ success: false, error: "Invalid request body." }, 400);
    const action = typeof body?.action === "string" ? body.action : "verify";
    const scope = ["verify", "directory", "artist"].includes(action) ? action : "other";
    const limit = scope === "verify" ? 10 : scope === "directory" ? 12 : scope === "artist" ? 20 : 10;
    if (scope === "directory" && rateLimited(`directory:${clientIp}`, 12)) return reply({ success: false, error: "Artist discovery is receiving too many requests. Please wait a minute and try again." }, 429);
    if (scope === "artist" && rateLimited(`artist:${clientIp}`, 20)) return reply({ success: false, error: "Too many artist-page requests. Please wait a minute and try again." }, 429);
    try {
      if (await persistentRateLimited(clientIp, scope, limit, 60)) return reply({ success: false, error: "Too many requests. Please wait a minute and try again." }, 429);
    } catch (rateError) {
      console.error("Shared request limiter unavailable");
      return reply({ success: false, error: "Request protection is temporarily unavailable. Please try again shortly." }, 503);
    }

    if (action === "verify") {
      const token = typeof body?.token === "string" ? body.token : "";
      if (!token || token.length > 4096) return reply({ success: false, error: "Complete the Cloudflare security check first." }, 400);
      const form = new URLSearchParams({ secret, response: token });
      const forwarded = req.headers.get("CF-Connecting-IP");
      if (forwarded) form.set("remoteip", forwarded);
      const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form, signal: AbortSignal.timeout(8000) });
      if (!result.ok) throw new Error("Turnstile verification service unavailable");
      const verdict = await result.json();
      if (!verdict.success) return reply({ success: false, error: "Cloudflare could not verify this check. Please try again." }, 400);
      const origin = req.headers.get("origin");
      let originHost = "";
      try { originHost = origin ? new URL(origin).hostname.toLowerCase() : ""; } catch { /* reject below */ }
      const challengeHost = typeof verdict.hostname === "string" ? verdict.hostname.toLowerCase() : "";
      if (!originHost || !challengeHost || originHost !== challengeHost) {
        return reply({ success: false, error: "This security check does not match this website. Reload and try again." }, 403);
      }
      return reply({ success: true, sessionToken: await issueSession(secret), expiresIn: 7200 });
    }

    if (!(await validSession(secret, body?.sessionToken))) return reply({ success: false, error: "Your listener session has expired. Complete the security check again." }, 401);

    if (action === "directory") {
      const profiles = await dbGet("profiles?select=public_slug,display_name,tagline,location,avatar_path,public_profile_preferences,is_public,role&is_public=eq.true&public_slug=not.is.null&role=neq.label_admin&order=display_name.asc&limit=200");
      const artists = profiles.filter((p: any) => p.public_slug && p.is_public === true && p.role !== "label_admin").map((p: any) => ({
        public_slug: boundedText(p.public_slug, 80),
        display_name: boundedText(p.display_name, 120, "Artist") || "Artist",
        tagline: boundedText(p.tagline, 240),
        location: truthy(p.public_profile_preferences?.location) ? boundedText(p.location, 120) : null,
        avatar_path: boundedText(p.avatar_path, 512),
      }));
      return reply({ success: true, artists });
    }

    if (action === "artist") {
      const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
      if (!slug || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ success: false, error: "This artist page is unavailable." }, 400);
      const rows = await dbGet(`profiles?select=id,public_slug,display_name,tagline,location,avatar_path,banner_path,bio,accent,profile_theme,links,email,show_email,public_profile_preferences,is_public,role&id=not.is.null&public_slug=eq.${encodeURIComponent(slug)}&is_public=eq.true&role=neq.label_admin&limit=1`);
      const p = rows[0];
      if (!p || !p.id) return reply({ success: false, error: "This artist page is private or the link is incorrect." }, 404);
      const prefs = p.public_profile_preferences || {};
      let releases: any[] = [];
      if (truthy(prefs.discography)) {
        const rows = await dbGet(`releases?select=id,title,release_type,release_date,artist_name,genre,streaming_links,artwork_path&owner_id=eq.${encodeURIComponent(p.id)}&status=eq.Live&order=release_date.desc.nullslast&limit=50`);
        const liveRows = (Array.isArray(rows) ? rows : []).slice(0, 50);
        const liveIds = liveRows.map((r: any) => String(r.id || "")).filter((id: string) => /^[0-9a-f-]{36}$/i.test(id));
        const tracks = liveIds.length ? await dbGet(`release_tracks?select=release_id,track_number,title&release_id=in.(${liveIds.join(",")})&order=track_number.asc&limit=500`) : [];
        const tracksByRelease = new Map<string, any[]>();
        for (const track of (Array.isArray(tracks) ? tracks : [])) {
          const key = String(track.release_id || "");
          const list = tracksByRelease.get(key) || [];
          list.push({
            track_number: Number.isFinite(Number(track.track_number)) ? Number(track.track_number) : 0,
            title: boundedText(track.title, 180, "Untitled track") || "Untitled track",
          });
          tracksByRelease.set(key, list);
        }
        releases = liveRows.map((release: any) => ({
          id: boundedText(release.id, 36),
          title: boundedText(release.title, 180, "Untitled release") || "Untitled release",
          release_type: boundedText(release.release_type, 40, "Release") || "Release",
          release_date: /^\d{4}-\d{2}-\d{2}$/.test(String(release.release_date || "")) ? release.release_date : null,
          artist_name: boundedText(release.artist_name, 120),
          genre: boundedText(release.genre, 80),
          artwork_path: boundedText(release.artwork_path, 512),
          streaming_links: publicStreamingLinks(release.streaming_links),
          tracks: tracksByRelease.get(String(release.id)) || [],
        }));
      }
      const artist = {
        public_slug: p.public_slug,
        display_name: boundedText(p.display_name, 120, "Artist") || "Artist",
        tagline: boundedText(p.tagline, 240),
        location: truthy(prefs.location) ? boundedText(p.location, 120) : null,
        avatar_path: boundedText(p.avatar_path, 512),
        banner_path: boundedText(p.banner_path, 512),
        bio: truthy(prefs.bio) ? boundedText(p.bio, 6000) : null,
        accent: /^#[0-9a-f]{6}$/i.test(String(p.accent || "")) ? p.accent : "#d7bd72",
        profile_theme: ["cinematic", "minimal", "neon", "classic"].includes(p.profile_theme) ? p.profile_theme : "cinematic",
        links: truthy(prefs.links) ? publicLinks(p.links) : [],
        contact_email: p.show_email === true && truthy(prefs.email, false) && typeof p.email === "string" && p.email.length <= 254 ? p.email : null,
        releases: truthy(prefs.discography) ? releases : [],
      };
      return reply({ success: true, artist });
    }
    return reply({ success: false, error: "Unknown action" }, 400);
  } catch (error) {
    console.error("Listener discovery request failed", error);
    return reply({ success: false, error: "We could not load artist discovery right now. Please try again." }, 500);
  }
});