import { sendLovableEmail } from "npm:@lovable.dev/email-js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// RealHunt transactional email. Called server-to-server from Postgres triggers
// with a shared secret stored in app_secrets (key = rh_email_secret).
// Sender: RealHunt <hello@realhunt.co> through the verified subdomain below.
const SENDER_DOMAIN = "notify.realhunt.co";
const FROM = "RealHunt <hello@realhunt.co>";
const DEFAULT_REPLY_TO = "carlos@equinoxinvestmentgroup.com";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // One-click unsubscribe: GET ?unsubscribe=<token>
  const url = new URL(req.url);
  const unsub = url.searchParams.get("unsubscribe");
  if (req.method === "GET" && unsub) {
    const { data } = await supabase.from("email_unsubscribe_tokens").select("email").eq("token", unsub).maybeSingle();
    if (data?.email) await supabase.from("suppressed_emails").upsert({ email: data.email }, { onConflict: "email" });
    return new Response(`<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;padding:40px;text-align:center;color:#141414"><h2>You are unsubscribed.</h2><p>No more emails from RealHunt. <a href="https://realhunt.co/">Back to the deals</a></p></body></html>`, { headers: { "Content-Type": "text/html" } });
  }

  try {
    const body = await req.json();
    const { data: sec } = await supabase.from("app_secrets").select("value").eq("key", "rh_email_secret").maybeSingle();
    if (!sec?.value || body.secret !== sec.value) return json({ error: "forbidden" }, 403);
    const to = String(body.to || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "valid to required" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const { data: sup } = await supabase.from("suppressed_emails").select("email").eq("email", to).maybeSingle();
    if (sup) return json({ ok: true, skipped: "suppressed" });

    let token = crypto.randomUUID().replace(/-/g, "");
    const { data: ex } = await supabase.from("email_unsubscribe_tokens").select("token").eq("email", to).maybeSingle();
    if (ex?.token) token = ex.token; else await supabase.from("email_unsubscribe_tokens").insert({ email: to, token });

    const id = crypto.randomUUID();
    const html = String(body.html || "").replace("</body>", `<p style="font-size:11px;color:#a8a293;text-align:center;margin-top:24px;"><a href="${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email?unsubscribe=${token}" style="color:#8a8578;">Unsubscribe</a></p></body>`);
    const text = String(body.text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) + `\n\nUnsubscribe: ${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email?unsubscribe=${token}`;
    const replyTo = String(body.reply_to || DEFAULT_REPLY_TO);
    await sendLovableEmail({ to, from: FROM, sender_domain: SENDER_DOMAIN, subject: String(body.subject || "RealHunt"), html, text, purpose: "transactional", label: String(body.label || "realhunt"), idempotency_key: `rh-${to}-${id}`, message_id: id, unsubscribe_token: token, reply_to: replyTo, replyTo: replyTo }, { apiKey });
    await supabase.from("email_send_log").insert({ message_id: id, recipient_email: to, template_name: String(body.label || "realhunt"), status: "sent" });
    return json({ ok: true, id });
  } catch (e: any) {
    console.error("send-email error", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});
