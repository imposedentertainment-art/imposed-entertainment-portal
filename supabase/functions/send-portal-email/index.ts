import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const b64 = (value: string) => btoa(String.fromCharCode(...encoder.encode(value)));

async function consumeRateLimit(actorId: string, scope: string, limit: number, windowSeconds = 60) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Request protection is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`actor:${actorId}`));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const response = await fetch(`${url}/rest/v1/rpc/consume_public_rate_limit`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_bucket_key: `${hash}:${scope}`, p_limit: limit, p_window_seconds: windowSeconds }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Request protection is temporarily unavailable");
  return (await response.json()) === true;
}

async function readBoundedBody(req: Request, maxBytes: number): Promise<string | null> {
  const declared = req.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) return null;
  if (!req.body) return "";
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxBytes) { await reader.cancel(); return null; } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function writeAll(conn: Deno.Conn, value: string) {
  const bytes = encoder.encode(value);
  let offset = 0;
  while (offset < bytes.length) offset += await conn.write(bytes.subarray(offset));
}
async function readLine(conn: Deno.Conn): Promise<string> {
  const bytes: number[] = [];
  const one = new Uint8Array(1);
  while (true) {
    const n = await conn.read(one);
    if (n === null) throw new Error("SMTP server closed the connection.");
    bytes.push(one[0]);
    if (one[0] === 10 || bytes.length > 8192) break;
  }
  if (bytes.length > 8192) throw new Error("SMTP response line was too long.");
  return decoder.decode(new Uint8Array(bytes)).replace(/[\r\n]+$/, "");
}
async function readReply(conn: Deno.Conn): Promise<{ code: number; text: string }> {
  const lines: string[] = [];
  let line: string;
  do {
    line = await readLine(conn);
    lines.push(line);
    if (lines.length > 30) throw new Error("Too many SMTP response lines.");
  } while (line.length >= 4 && line[3] === "-");
  return { code: Number(lines[lines.length - 1]?.slice(0, 3)), text: lines.join("\n") };
}
async function expect(conn: Deno.Conn, allowed: number[], command?: string) {
  if (command) await writeAll(conn, command + "\r\n");
  const reply = await readReply(conn);
  if (!allowed.includes(reply.code)) throw new Error(`SMTP command failed (${reply.code}).`);
  return reply;
}
async function sendGmail(to: string, subject: string, html: string) {
  const user = Deno.env.get("GMAIL_SMTP_USER");
  const pass = Deno.env.get("GMAIL_SMTP_APP_PASSWORD");
  const fromName = Deno.env.get("GMAIL_FROM_NAME") || "Imposed Entertainment";
  if (!user || !pass) throw new Error("Email is not configured: set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD as Supabase function secrets.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Sender or recipient email address is invalid.");
  let conn: Deno.Conn = await Deno.connect({ hostname: "smtp.gmail.com", port: 587 });
  try {
    await expect(conn, [220]);
    await expect(conn, [250], "EHLO imposed-entertainment.local");
    await expect(conn, [220], "STARTTLS");
    conn = await Deno.startTls(conn, { hostname: "smtp.gmail.com" });
    await expect(conn, [250], "EHLO imposed-entertainment.local");
    await expect(conn, [235], "AUTH PLAIN " + b64(`\0${user}\0${pass}`));
    await expect(conn, [250], `MAIL FROM:<${user}>`);
    await expect(conn, [250, 251], `RCPT TO:<${to}>`);
    await expect(conn, [354], "DATA");
    const body64 = b64(html).match(/.{1,76}/g)?.join("\r\n") || "";
    const safeName = fromName.replace(/[\r\n"<>]/g, "").slice(0, 80);
    const message = [
      `From: =?UTF-8?B?${b64(safeName)}?= <${user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@imposed-entertainment.local>`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      body64,
      ".",
      "",
    ].join("\r\n") + "\r\n";
    await writeAll(conn, message);
    await expect(conn, [250]);
    try { await expect(conn, [221], "QUIT"); } catch { /* Gmail may close after accepting DATA. */ }
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 503);
  const token = (req.headers.get("Authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Sign in required." }, 401);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Session is invalid or expired." }, 401);
  try {
    if (await consumeRateLimit(authData.user.id, "mail", 8, 60)) return json({ error: "Too many email actions. Wait a minute and try again." }, 429);
  } catch (rateError) {
    console.error("Email request limiter unavailable");
    return json({ error: "Request protection is temporarily unavailable. Please try again shortly." }, 503);
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("profiles").select("*").eq("id", authData.user.id).maybeSingle();
  if (actorError || !actor) return json({ error: "Account profile unavailable." }, 403);
  let body: { event?: string; id?: string; subject?: string; message?: string };
  let rawBody: string | null;
  try { rawBody = await readBoundedBody(req, 16384); } catch { return json({ error: "Request body must be valid UTF-8." }, 400); }
  if (rawBody === null) return json({ error: "Request body is too large." }, 413);
  try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request body." }, 400);
  const event = body.event;
  if (event !== "support" && !["label_admin", "admin"].includes(String(actor.role).toLowerCase())) return json({ error: "Label admin access required." }, 403);
  const id = String(body.id || "");
  if (event === "announcement") {
    try { if (await consumeRateLimit(authData.user.id, "announcement", 2, 300)) return json({ error: "Too many announcements in a short period. Please wait before trying again." }, 429); }
    catch { return json({ error: "Request protection is temporarily unavailable. Please try again shortly." }, 503); }
  }
  if (event === "support") {
    try { if (await consumeRateLimit(authData.user.id, "support", 3, 300)) return json({ error: "Too many support messages. Please wait a few minutes before trying again." }, 429); }
    catch { return json({ error: "Request protection is temporarily unavailable. Please try again shortly." }, 503); }
    if (typeof body.subject !== "string" || typeof body.message !== "string") return json({ error: "Subject and message are required." }, 400);
    const supportSubject = body.subject.trim();
    const supportMessage = body.message.trim();
    if (supportSubject.length < 3 || supportSubject.length > 100 || supportMessage.length < 10 || supportMessage.length > 3000) return json({ error: "Subject or message length is invalid." }, 400);
    const username = String(actor.username || actor.display_name || actor.full_name || authData.user.user_metadata?.username || authData.user.user_metadata?.preferred_username || authData.user.email?.split("@")[0] || "Portal user").slice(0, 120);
    const recipient = Deno.env.get("SUPPORT_EMAIL") || Deno.env.get("GMAIL_SMTP_USER");
    if (!recipient) return json({ error: "Support email is not configured." }, 503);
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171923;line-height:1.5"><h1>Portal support request</h1><p><strong>Username / account name:</strong> ${escapeHtml(username)}</p><p><strong>Email:</strong> ${escapeHtml(authData.user.email || actor.email || "Unavailable")}</p><p><strong>Account ID:</strong> ${escapeHtml(authData.user.id)}</p><p><strong>Subject:</strong> ${escapeHtml(supportSubject)}</p><hr><p style="white-space:pre-wrap">${escapeHtml(supportMessage)}</p></body></html>`;
    try {
      await sendGmail(recipient, `Portal support: ${supportSubject.slice(0, 100)}`, html);
      return json({ sent: true });
    } catch (error) {
      console.error("Support email failed", error instanceof Error ? error.message.slice(0, 160) : "unknown error");
      return json({ sent: false, reason: "support_email_delivery_failed" }, 503);
    }
  }
  if (!["label_admin", "admin"].includes(String(actor.role).toLowerCase())) return json({ error: "Label admin access required." }, 403);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["release_status", "statement_published", "announcement"].includes(String(event))) return json({ error: "Unsupported email event." }, 400);
  try {
    let recipientId = "";
    let subject = "";
    let title = "";
    let message = "";
    if (event === "announcement") {
      const { data: announcement, error: announcementError } = await admin.from("announcements").select("id,title,body,created_by").eq("id", id).maybeSingle();
      if (announcementError || !announcement) return json({ error: "Announcement not found." }, 404);
      const { data: recipients, error: recipientsError } = await admin.from("profiles").select("id,email,display_name,full_name,notification_preferences").limit(500);
      if (recipientsError) return json({ error: "Could not load announcement recipients." }, 500);
      const eligible = (recipients || []).filter((p: any) => {
        const prefs = p.notification_preferences && typeof p.notification_preferences === "object" ? p.notification_preferences : {};
        return prefs.announcements !== false;
      });
      if (eligible.length) {
        const rows = eligible.map((p: any) => ({
          user_id: p.id, kind: "announcement", title: String(announcement.title || "Label announcement").slice(0, 160),
          body: String(announcement.body || "").slice(0, 2000), read: false
        }));
        const { error: notificationError } = await admin.from("notifications").insert(rows);
        if (notificationError) return json({ error: "Announcement saved, but inbox notifications could not be created." }, 500);
      }
      let emailed = 0;
      let failed = 0;
      for (const recipient of eligible) {
        if (!recipient.email) { failed++; continue; }
        try {
          const greeting = recipient.display_name || recipient.full_name || "there";
          const safeTitle = escapeHtml(announcement.title || "Label announcement");
          const safeBody = escapeHtml(announcement.body || "").replace(/\\n/g, "<br>");
          const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#171923"><div style="max-width:600px;margin:32px auto;padding:28px;background:#fff;border-radius:14px"><p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#555">IMPOSED ENTERTAINMENT</p><h1 style="font-size:24px">${safeTitle}</h1><p>Hi ${escapeHtml(greeting)},</p><p>${safeBody}</p><p style="margin-top:28px;color:#656b76;font-size:13px">You received this email because label announcements are enabled in your Imposed Entertainment portal preferences.</p></div></body></html>`;
          await sendGmail(recipient.email, `Imposed Entertainment: ${String(announcement.title || "Label announcement").slice(0, 100)}`, html);
          emailed++;
        } catch (emailError) {
          failed++;
          console.error("Announcement email failed for one recipient", emailError instanceof Error ? emailError.message.slice(0, 120) : "unknown error");
        }
      }
      return json({ sent: failed === 0, notifications_created: eligible.length, emailed, failed, reason: failed ? "some_emails_failed" : undefined });
    }
    if (event === "release_status") {
      const { data: release, error } = await admin.from("releases").select("id,owner_id,title,artist_name,status,review_note").eq("id", id).maybeSingle();
      if (error || !release) return json({ error: "Release not found." }, 404);
      recipientId = release.owner_id;
      subject = `Release update: ${release.title}`;
      title = "Your release has been updated";
      message = `The status of <strong>${escapeHtml(release.title)}</strong> by ${escapeHtml(release.artist_name)} is now <strong>${escapeHtml(release.status)}</strong>.`;
      if (release.review_note && ["Changes Requested", "Rejected"].includes(release.status)) message += `<p><strong>Label note:</strong><br>${escapeHtml(release.review_note).replace(/\n/g, "<br>")}</p>`;
    } else {
      const { data: statement, error } = await admin.from("artist_statements").select("id,artist_id,statement_number,period_start,period_end,status").eq("id", id).maybeSingle();
      if (error || !statement || statement.status !== "published") return json({ error: "Published statement not found." }, 404);
      recipientId = statement.artist_id;
      subject = `Royalty statement available${statement.statement_number ? `: ${statement.statement_number}` : ""}`;
      title = "Your royalty statement is ready";
      message = `Your statement${statement.statement_number ? ` <strong>${escapeHtml(statement.statement_number)}</strong>` : ""} for ${escapeHtml(statement.period_start)} to ${escapeHtml(statement.period_end)} has been published. Sign in to the Imposed Entertainment portal to view the full details securely.`;
    }
    const { data: recipient, error: recipientError } = await admin.from("profiles").select("email,display_name,full_name,notification_preferences").eq("id", recipientId).maybeSingle();
    if (recipientError || !recipient?.email) return json({ sent: false, reason: "recipient_email_missing" }, 200);
    const preferences = recipient.notification_preferences && typeof recipient.notification_preferences === "object" ? recipient.notification_preferences : {};
    if (preferences.release_updates === false) return json({ sent: false, skipped: true, reason: "email_notifications_disabled" }, 200);
    const greeting = recipient.display_name || recipient.full_name || "there";
    const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#171923"><div style="max-width:600px;margin:32px auto;padding:28px;background:#fff;border-radius:14px"><p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#555">IMPOSED ENTERTAINMENT</p><h1 style="font-size:24px">${title}</h1><p>Hi ${escapeHtml(greeting)},</p><p>${message}</p><p style="margin-top:28px;color:#656b76;font-size:13px">This is an automated portal notification. Sign in to the Imposed Entertainment portal to manage your releases and account.</p></div></body></html>`;
    await sendGmail(recipient.email, subject, html);
    return json({ sent: true });
  } catch (error) {
    console.error("Portal email send failed", error instanceof Error ? error.message.slice(0, 180) : "unknown error");
    return json({ sent: false, reason: "email_delivery_failed" }, 503);
  }
});