import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAuthEmail, ResendDeliveryError } from "../_shared/resend-auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "X-RealHunt-Mail-Version": "resend-outbox-v2" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const url = new URL(req.url), unsub = url.searchParams.get("unsubscribe");
  if ((req.method === "GET" || req.method === "POST") && unsub) {
    const { data, error } = await db.from("email_unsubscribe_tokens").select("email").eq("token", unsub).maybeSingle();
    if (error) return json({ error: "Please try again" }, 503);
    if (data?.email) { const { error } = await db.from("suppressed_emails").upsert({ email: data.email }, { onConflict: "email" }); if (error) return json({ error: "Please try again" }, 503); }
    return new Response('<!doctype html><html lang="en"><body style="font-family:Arial;padding:40px;text-align:center"><h1>You are unsubscribed.</h1><p>Marketing emails have stopped. Account access emails remain available.</p><a href="https://realhunt.co">Back to RealHunt</a></body></html>', { headers: { "Content-Type": "text/html" } });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const { data: secret } = await db.from("app_secrets").select("value").eq("key", "rh_email_secret").maybeSingle();
    if (!secret?.value || body.secret !== secret.value) return json({ error: "Forbidden" }, 403);
    const to = String(body.to || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Valid recipient required" }, 400);
    const label = String(body.label || "realhunt"), isAuth = /^(confirm-|sorry-confirm-)/.test(label);
    const { data: suppressed } = await db.from("suppressed_emails").select("email").eq("email", to).maybeSingle();
    if (suppressed && !isAuth) return json({ ok: true, skipped: "suppressed" });
    let html = String(body.html || ""), text = String(body.text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (html.length > 200000) return json({ error: "Email too large" }, 400);
    let unsubscribeHeaders: Record<string, string> | undefined;
    if (!isAuth) {
      const { data: existing } = await db.from("email_unsubscribe_tokens").select("token").eq("email", to).maybeSingle();
      const token = existing?.token || crypto.randomUUID().replace(/-/g, "");
      if (!existing) { const { error } = await db.from("email_unsubscribe_tokens").insert({ email: to, token }); if (error) return json({ error: "Could not prepare email" }, 503); }
      const link = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email?unsubscribe=${token}`;
      unsubscribeHeaders = { "List-Unsubscribe": `<${link}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
      const footer = `<p style="font-size:12px;text-align:center"><a href="${link}">Unsubscribe</a></p>`;
      html = html.includes("</body>") ? html.replace("</body>", footer + "</body>") : html + footer;
      text += `\n\nUnsubscribe: ${link}`;
    }
    // Outbox retries reuse this event identifier. Legacy callers use a content digest.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([to, label, body.subject, body.html])));
    const fallbackId = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    const messageId = body.outbox_id ? `outbox-${body.outbox_id}` : `mail-${fallbackId}`;
    const providerId = await sendAuthEmail({ runId: messageId, actionType: isAuth ? "confirmation" : "transactional", to, subject: String(body.subject || "RealHunt"), html, text, category: isAuth ? "auth" : "transactional", replyTo: String(body.reply_to || "carlos@equinoxinvestmentgroup.com"), headers: unsubscribeHeaders }, { apiKey: Deno.env.get("RESEND_API_KEY"), from: Deno.env.get("RESEND_FROM_EMAIL") || "RealHunt <hello@realhunt.co>" });
    await db.from("email_send_log").insert({ message_id: messageId, provider_email_id: providerId, recipient_email: to, template_name: label, status: "sent" });
    return json({ ok: true, id: providerId });
  } catch (error) {
    const status = error instanceof ResendDeliveryError ? (error.retryable ? 503 : 400) : 500;
    return json({ error: error instanceof ResendDeliveryError ? error.message : "Email could not be sent" }, status);
  }
});
