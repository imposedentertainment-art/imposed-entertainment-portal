import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://portal.pages.dev",
  "https://imposed-entertainment-portal.pages.dev",
  "https://imposedentertainment.pages.dev",
  "https://imposedentertainment.com",
  "https://www.imposedentertainment.com",
]);
function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  try {
    const parsed = new URL(origin);
    // Cloudflare Pages preview aliases are eight-character commit hashes under
    // the exact portal project domain. This is a CORS rule, not authorization:
    // the handler still requires a valid user JWT and a label-admin profile.
    return parsed.protocol === "https:" &&
      /^[a-f0-9]{8}\.imposed-entertainment-portal\.pages\.dev$/i.test(parsed.hostname) &&
      !parsed.port;
  } catch { return false; }
}
function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allow = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allow ? origin : "https://imposed-entertainment-portal.pages.dev",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors(req) });
const enc = new TextEncoder();
async function rateLimit(admin: ReturnType<typeof createClient>, userId: string) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`portal-health:${userId}`));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const { data, error } = await admin.rpc("consume_public_rate_limit", { p_bucket_key: `${hash}:health`, p_limit: 6, p_window_seconds: 60 });
  if (error) throw new Error("Request protection is temporarily unavailable.");
  return data === true;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { success: false, error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !service) return json(req, { success: false, error: "Diagnostics are not configured." }, 503);
  const token = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(req, { success: false, error: "Sign in required." }, 401);
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) return json(req, { success: false, error: "Session is invalid or expired." }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (actorError || !actor || !["label_admin", "admin"].includes(String(actor.role).toLowerCase())) return json(req, { success: false, error: "Label admin access required." }, 403);
  try { if (await rateLimit(admin, authData.user.id)) return json(req, { success: false, error: "Too many diagnostic requests. Wait a minute and retry." }, 429); }
  catch { return json(req, { success: false, error: "Request protection is temporarily unavailable." }, 503); }
  const checks: {key:string;label:string;status:"ok"|"warning"|"failed";detail:string}[] = [];
  const tableNames = ["profiles", "releases", "release_tracks", "release_tasks", "notifications", "release_audit_log", "release_delivery_records", "release_track_version_history", "release_track_feedback", "release_comments", "release_internal_notes", "artist_statements", "podcast_submissions", "vault_files", "band_members"];
  const dbStart = performance.now();
  const { error: dbError } = await admin.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
  checks.push({ key: "database", label: "Supabase database", status: dbError ? "failed" : "ok", detail: dbError ? "Database query failed. Check Supabase logs and project status." : `Connected; response ${Math.round(performance.now() - dbStart)} ms.` });
  const tableResults = await Promise.all(tableNames.map(async name => {
    try { const { error } = await admin.from(name).select("*", { head: true, count: "exact" }).limit(1); return { name, ok: !error }; }
    catch { return { name, ok: false }; }
  }));
  const missing = tableResults.filter(x => !x.ok).map(x => x.name);
  checks.push({ key: "schema", label: "Core feature tables", status: missing.length ? "failed" : "ok", detail: missing.length ? `Unavailable tables: ${missing.join(", ")}. This may indicate schema drift or a backend issue.` : `${tableResults.length} core tables are reachable.` });
  try {
    const { data, error } = await admin.storage.listBuckets();
    if (error) throw error;
    const names = new Set((data || []).map((b: {name:string}) => b.name));
    const expected = ["artwork", "audio", "vault", "profile-media", "releases-content"];
    const absent = expected.filter(n => !names.has(n));
    checks.push({ key: "storage", label: "Storage buckets", status: absent.length ? "warning" : "ok", detail: absent.length ? `Missing expected buckets: ${absent.join(", ")}.` : `${expected.length} required media buckets found; private bucket access remains governed by Storage RLS.` });
  } catch { checks.push({ key: "storage", label: "Storage buckets", status: "failed", detail: "Storage bucket listing failed. Check Storage service status and permissions." }); }
  const mailConfigured = Boolean(Deno.env.get("GMAIL_SMTP_USER") && Deno.env.get("GMAIL_SMTP_APP_PASSWORD"));
  checks.push({ key: "email", label: "Email configuration", status: mailConfigured ? "ok" : "warning", detail: mailConfigured ? "SMTP sender secrets are present. No test email was sent, so actual delivery is not verified." : "Gmail SMTP secrets are missing. Email delivery will fail until sender credentials are configured." });
  const supportConfigured = Boolean(Deno.env.get("SUPPORT_EMAIL") || Deno.env.get("GMAIL_SMTP_USER"));
  checks.push({ key: "support_email", label: "Support recipient", status: supportConfigured ? "ok" : "warning", detail: supportConfigured ? "A support recipient is configured; recipient inbox delivery has not been tested." : "SUPPORT_EMAIL and GMAIL_SMTP_USER are both missing." });
  const turnstileConfigured = Boolean(Deno.env.get("TURNSTILE_SECRET_KEY"));
  checks.push({ key: "turnstile", label: "Public abuse protection", status: turnstileConfigured ? "ok" : "warning", detail: turnstileConfigured ? "Turnstile secret is present. This is a configuration check, not a challenge simulation." : "Turnstile secret is missing; public verification cannot complete." });
  checks.push({ key: "rate_limit", label: "Shared rate limiter", status: "ok", detail: "This diagnostic request passed the shared database rate limiter; repeated checks are throttled per admin account." });
  const failures = checks.filter(c => c.status === "failed").length;
  const warnings = checks.filter(c => c.status === "warning").length;
  return json(req, { success: true, checkedAt: new Date().toISOString(), checks, summary: { total: checks.length, healthy: checks.filter(c => c.status === "ok").length, warnings, failures } });
});