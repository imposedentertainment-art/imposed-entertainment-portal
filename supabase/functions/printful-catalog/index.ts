import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const allowedOrigins = new Set([
  "https://imposedentertainment.com",
  "https://www.imposedentertainment.com",
  "https://imposed-entertainment-portal.pages.dev",
  "https://imposedentertainment.pages.dev",
  "http://localhost:8888",
  "http://127.0.0.1:8888",
]);
function isAllowedOrigin(origin: string) {
  if (allowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    // Only aliases for this Cloudflare Pages project are admitted; arbitrary
    // *.pages.dev origins are not. JWT validation and the profile role check
    // below remain the actual access-control boundary.
    return parsed.protocol === "https:" &&
      /^[a-f0-9]{8}\.imposed-entertainment-portal\.pages\.dev$/i.test(parsed.hostname) &&
      !parsed.port;
  } catch { return false; }
}
function corsOrigin(origin: string) {
  return isAllowedOrigin(origin) ? origin : "https://imposed-entertainment-portal.pages.dev";
}
function json(body: Record<string, unknown>, status = 200, origin = "") {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Access-Control-Allow-Origin": corsOrigin(origin) } });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...corsHeaders, "Access-Control-Allow-Origin": corsOrigin(origin) } });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
  const authorization = req.headers.get("authorization") || "";
  if (!supabaseUrl || !anonKey) return json({ error: "Backend authentication is not configured." }, 500, origin);
  if (!/^Bearer\s+\S+/i.test(authorization)) return json({ error: "Sign in to use Printful tools." }, 401, origin);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!userResponse.ok) return json({ error: "Your session is invalid or has expired." }, 401, origin);
    const user = await userResponse.json();
    if (!user?.id) return json({ error: "Sign in to use Printful tools." }, 401, origin);

    const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
    profileUrl.searchParams.set("id", `eq.${user.id}`);
    profileUrl.searchParams.set("select", "role");
    const profileResponse = await fetch(profileUrl, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!profileResponse.ok) return json({ error: "Could not verify shop permissions." }, 403, origin);
    const profiles = await profileResponse.json();
    if (!Array.isArray(profiles) || !["artist", "label_admin"].includes(profiles[0]?.role)) {
      return json({ error: "Only artists and label administrators can access Printful tools." }, 403, origin);
    }
    if (!printfulToken) return json({ error: "PRINTFUL_API_TOKEN is not configured in Supabase Edge Function secrets." }, 503, origin);

    const body = await req.json().catch(() => ({}));
    if (body?.action !== "catalog") return json({ error: "Unsupported action." }, 400, origin);

    const upstream = await fetch("https://api.printful.com/products", {
      headers: { Authorization: `Bearer ${printfulToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) {
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : 502;
      return json({ error: upstream.status === 401 || upstream.status === 403 ? "Printful rejected the configured token. Check the token and store access." : "Printful catalogue is temporarily unavailable." }, status, origin);
    }
    const payload = await upstream.json();
    const raw = Array.isArray(payload?.result) ? payload.result : [];
    const products = raw.slice(0, 250).map((p: Record<string, unknown>) => ({
      id: String(p.id ?? ""),
      title: String(p.title ?? p.type_name ?? "Printful product").slice(0, 180),
      image: typeof p.image === "string" && /^https:\/\//i.test(p.image) ? p.image : "",
      variant_count: Number.isFinite(Number(p.variant_count)) ? Number(p.variant_count) : null,
    })).filter((p: { id: string }) => p.id);
    return json({ products, count: products.length }, 200, origin);
  } catch (error) {
    console.error("printful-catalog failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Could not connect to Printful right now. Please try again." }, 502, origin);
  }
});
