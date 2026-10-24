import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("PORTAL_ORIGIN") || "https://imposedentertainment.com",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Origin",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("ASTRA_AI_API_KEY");
  if (!url || !anon || !apiKey) return json(503, { error: "Astra AI is not configured" });

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return json(401, { error: "Sign-in required" });
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ASTRA_AI_MODEL") || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Astra AI, the helpful assistant inside Imposed Entertainment's artist and label portal. Help with portal navigation, music release planning, metadata preparation, artist development and label operations. Do not claim to have accessed account records or changed data unless a verified tool did so. Never request passwords, one-time codes, or payment credentials. Be clear that release submissions must be entered and reviewed by the label; do not claim a distributor integration exists." },
        ...messages,
      ],
      max_tokens: 700,
      temperature: 0.5,
    }),
  });
  if (!response.ok) {
    console.error("Astra provider returned status", response.status);
    return json(502, { error: "AI service temporarily unavailable" });
  }
  const result = await response.json();
  const reply = result?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) return json(502, { error: "AI service returned no reply" });
  return json(200, { reply: reply.trim().slice(0, 8000) });
});
