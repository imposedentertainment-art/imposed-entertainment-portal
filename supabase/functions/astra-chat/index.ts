import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const portalOrigin = Deno.env.get("PORTAL_ORIGIN") || "https://imposedentertainment.com";
const cors = {
  "Access-Control-Allow-Origin": portalOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const origin = req.headers.get("Origin");
  if (origin && origin !== portalOrigin) return json(403, { error: "Origin not allowed" });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const workerUrl = Deno.env.get("ASTRA_WEB_WORKER_URL");
  if (!url || !anon || !workerUrl) return json(503, { error: "Astra AI is not configured" });

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.length > 12000) return json(401, { error: "Sign-in required" });
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json(401, { error: "Sign-in required" });

  let body: { messages?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid request" }); }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 12) {
    return json(400, { error: "Send between 1 and 12 messages" });
  }
  const messages = body.messages.map((m) => {
    if (!m || typeof m !== "object") return null;
    const item = m as Record<string, unknown>;
    if (!["user", "assistant"].includes(String(item.role)) || typeof item.content !== "string") return null;
    const content = item.content.trim();
    if (!content || content.length > 2000) return null;
    return { role: item.role as "user" | "assistant", content };
  });
  if (messages.some((m) => !m) || messages[messages.length - 1]?.role !== "user") {
    return json(400, { error: "Invalid message history" });
  }

  try {
    // The Cloudflare Worker verifies this same Supabase session and requires
    // a linked Discord identity before accessing the shared Astra brain.
    const upstream = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Authorization": auth,
        "Content-Type": "application/json",
        "Origin": portalOrigin,
      },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(25000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = [400, 401, 403, 429].includes(upstream.status) ? upstream.status : 503;
      return json(status, { error: typeof result?.error === "string" ? result.error : "Astra is temporarily unavailable" });
    }
    if (typeof result?.reply !== "string" || !result.reply.trim()) return json(502, { error: "Astra returned no reply" });
    return json(200, { reply: result.reply.slice(0, 8000) });
  } catch (error) {
    console.error("Astra Worker request failed:", String(error?.message || error));
    return json(503, { error: "Astra is temporarily unavailable. Please try again shortly." });
  }
});
