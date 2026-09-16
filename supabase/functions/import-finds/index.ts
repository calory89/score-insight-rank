// One-shot importer: POST {url:"https://.../finds.json", secret:"..."} with rows for public.ig_finds.
// Lets weekly Instagram refreshes land without passing data through any chat or UI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SECRET = "rh-import-9f3c2a7e-2026";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { url, secret, method } = await req.json();
    if (secret !== SECRET) return new Response("forbidden", { status: 403, headers: cors });
    const r = method === "POST" ? await fetch(url, { method: "POST" }) : await fetch(url);
    if (!r.ok) return new Response("fetch failed " + r.status, { status: 502, headers: cors });
    const rows = await r.json();
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
