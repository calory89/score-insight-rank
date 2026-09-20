import { Webhook } from "npm:svix@1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!req.headers.get("svix-id") || !req.headers.get("svix-signature") || !req.headers.get("svix-timestamp")) return new Response("Signature required", { status: 401 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await db.from("app_secrets").select("value").eq("key", "resend_webhook_secret").maybeSingle();
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") || data?.value;
  if (!secret) return new Response("Delivery tracking is not configured", { status: 503 });
  const body = await req.text();
  if (body.length > 100000) return new Response("Payload too large", { status: 413 });
  let event: any;
  try { event = new Webhook(secret).verify(body, { "svix-id": req.headers.get("svix-id")!, "svix-signature": req.headers.get("svix-signature")!, "svix-timestamp": req.headers.get("svix-timestamp")! }); }
  catch { return new Response("Invalid signature", { status: 401 }); }
  const { error } = await db.rpc("record_email_delivery", { p_event_id: req.headers.get("svix-id"), p_provider_id: event.data?.email_id, p_type: event.type, p_at: event.created_at });
  return new Response(error ? "Could not record event" : "OK", { status: error ? 503 : 200 });
});
