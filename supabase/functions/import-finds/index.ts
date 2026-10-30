// One-shot importer: POST {url:"https://.../finds.json", secret:"..."} with rows for public.ig_finds.
// Lets weekly Instagram refreshes land without passing data through any chat or UI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, authErrorResponse } from "../_shared/require-auth.ts";
const ALLOWED_HOSTS = ["raw.githubusercontent.com", "realhunt.co", "www.realhunt.co"];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = await requireAdmin(req);
    if ("failure" in auth) return authErrorResponse(auth.failure, cors);
    const { url } = await req.json();
    let target: URL;
    try { target = new URL(String(url)); } catch { return new Response("invalid url", { status: 400, headers: cors }); }
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.includes(target.hostname)) return new Response("host not allowed", { status: 400, headers: cors });
    const r = await fetch(target.toString(), { redirect: "error" });
    if (!r.ok) return new Response("fetch failed " + r.status, { status: 502, headers: cors });
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length > 5000) return new Response("invalid rows", { status: 400, headers: cors });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let n = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await sb.from("ig_finds").upsert(rows.slice(i, i + 50), { onConflict: "post_url" });
      if (error) return new Response("upsert error: " + error.message + " at " + i, { status: 500, headers: cors });
      n += Math.min(50, rows.length - i);
    }
    return new Response(JSON.stringify({ ok: true, upserted: n }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) { return new Response("error: " + String(e), { status: 500, headers: cors }); }
});
