// RealHunt Score extension API (9-oct-2026). Called by the Chrome extension's service worker.
//  - nearby:  counts of places within a walk of a listing's published map point (OpenStreetMap Overpass), cached 30 days
//  - analyze: reads a listing description with AI for red flags and highlights (only after consent), cached 7 days per listing
//  - verify_start / verify_check: 6-digit email code so accounts are real (the user asks for it; no marketing is sent)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const AI_DAILY_PER_USER = 60, AI_DAILY_TOTAL = 3000;
const FLAG_KINDS = ["occupied", "auction", "bare", "legal", "renovation", "investors", "rented", "rustic", "vague", "other"];
const PLUS_KINDS = ["terrace", "lift", "parking", "pool", "garden", "renovated", "view", "ac", "light", "storage", "other"];

async function sha(s: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function overpass(lat: number, lng: number) {
  const A = (r: number) => `(around:${r},${lat},${lng})`;
  const q = `[out:json][timeout:12];(nwr${A(800)}[highway=bus_stop];nwr${A(800)}[railway~"^(station|halt|tram_stop|subway_entrance)$"];);out count;` +
    `nwr${A(800)}[shop~"^(supermarket|convenience|greengrocer|bakery|butcher)$"];out count;nwr${A(800)}[amenity~"^(school|kindergarten)$"];out count;` +
    `nwr${A(800)}[amenity~"^(pharmacy|doctors|clinic|hospital)$"];out count;nwr${A(800)}[leisure~"^(park|playground)$"];out count;nwr${A(2000)}[natural=beach];out count;`;
  for (const u of OVERPASS) {
    try {
      const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RealHunt-Score/0.3 (+https://realhunt.co/extension)" }, signal: AbortSignal.timeout(14000) });
      if (!r.ok) continue;
      const n = (await r.json()).elements.map((e: any) => +((e.tags || {}).total || 0));
      if (n.length >= 6) return { transit: n[0], shop: n[1], school: n[2], health: n[3], park: n[4], beach: n[5] };
    } catch { /* next mirror */ }
  }
  return null;
}

async function ai(text: string, lang: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  const sys = `You read one property listing description and report only what it literally says. Output JSON only:
{"flags":[{"k":one of ${JSON.stringify(FLAG_KINDS)},"quote":"exact words from the text, max 8 words","note":"max 10 words, in ${lang}"}],
 "plus":[{"k":one of ${JSON.stringify(PLUS_KINDS)},"quote":"exact words, max 6 words","note":"max 5 words, in ${lang}"}],
 "missing":["up to 4 important facts a buyer would want that the text does not give, each max 4 words, in ${lang}"],
 "summary":"one neutral sentence, max 18 words, in ${lang}"}
Rules: flags = real risks for a buyer (occupied/squatters, auction, bare ownership/usufruct, legal or paperwork problems, needs renovation, investor-only/cash-only, sold with tenant, rustic land, hype with no facts, or other concrete risk). Never invent. If nothing, use empty arrays. Quotes must appear in the text.`;
  for (const model of ["google/gemini-2.5-flash-lite", "google/gemini-3-flash-preview"]) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: text.slice(0, 6000) }], response_format: { type: "json_object" } }),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) continue;
      const c = (await r.json()).choices?.[0]?.message?.content || "";
      const o = JSON.parse(c.replace(/^```(json)?|```$/g, "").trim());
      const lower = text.toLowerCase();
      const keep = (q: string) => !q || lower.includes(String(q).toLowerCase().slice(0, 40)); // drop anything not actually in the text
      return {
        flags: (o.flags || []).filter((x: any) => FLAG_KINDS.includes(x.k) && keep(x.quote)).slice(0, 6).map((x: any) => ({ k: x.k, quote: String(x.quote || "").slice(0, 80), note: String(x.note || "").slice(0, 90) })),
        plus: (o.plus || []).filter((x: any) => PLUS_KINDS.includes(x.k) && keep(x.quote)).slice(0, 8).map((x: any) => ({ k: x.k, quote: String(x.quote || "").slice(0, 60), note: String(x.note || "").slice(0, 40) })),
        missing: (o.missing || []).slice(0, 4).map((x: any) => String(x).slice(0, 40)),
        summary: String(o.summary || "").slice(0, 200), model,
      };
    } catch { /* try next model */ }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let b: any; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const user = b.token ? (await db.from("ext_users").select("id,email,deleted_at").eq("token", b.token).is("deleted_at", null).maybeSingle()).data : null;

  if (b.action === "nearby") {
    const lat = +b.lat, lng = +b.lng;
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return json({ error: "coords" }, 400);
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const c = (await db.from("ext_geo_cache").select("v,t").eq("key", key).maybeSingle()).data;
    if (c && Date.now() - new Date(c.t).getTime() < 30 * 864e5) return json({ v: c.v, cached: true });
    const v = await overpass(lat, lng);
    if (v) await db.from("ext_geo_cache").upsert({ key, v, t: new Date().toISOString() });
    return json({ v });
  }

  if (b.action === "analyze") {
    if (!user) return json({ error: "consent" }, 403);
    const text = String(b.text || "").trim(); const hash = String(b.hash || "").slice(0, 64); const lang = /^(es|en|da|de|it|pt)$/.test(b.lang) ? b.lang : "en";
    if (text.length < 40 || !hash) return json({ v: null });
    const th = (await sha(text)).slice(0, 32);
    const c = (await db.from("ext_ai_cache").select("v,text_hash,t").eq("hash", hash).eq("lang", lang).maybeSingle()).data;
    if (c && c.text_hash === th && Date.now() - new Date(c.t).getTime() < 7 * 864e5) return json({ v: c.v, cached: true });
    const since = new Date(Date.now() - 864e5).toISOString();
    const mine = (await db.from("ext_ai_cache").select("hash", { count: "exact", head: true }).eq("user_id", user.id).gte("t", since)).count || 0;
    const all = (await db.from("ext_ai_cache").select("hash", { count: "exact", head: true }).gte("t", since)).count || 0;
    if (mine >= AI_DAILY_PER_USER || all >= AI_DAILY_TOTAL) return json({ v: null, limit: true });
    const v = await ai(text, { es: "Spanish", en: "English", da: "Danish", de: "German", it: "Italian", pt: "Portuguese" }[lang]!);
    if (v) await db.from("ext_ai_cache").upsert({ hash, lang, text_hash: th, v, user_id: user.id, t: new Date().toISOString() }); // stores the result, never the text
    return json({ v });
  }

  if (b.action === "verify_start") {
    if (!user) return json({ error: "consent" }, 403);
    const email = String(b.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email" }, 400);
    const recent = (await db.from("ext_users").select("code_sent_at").eq("id", user.id).maybeSingle()).data;
    if (recent?.code_sent_at && Date.now() - new Date(recent.code_sent_at).getTime() < 45e3) return json({ error: "wait" }, 429);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.from("ext_users").update({ pending_email: email, code_hash: await sha(code + user.id), code_exp: new Date(Date.now() + 15 * 60e3).toISOString(), code_tries: 0, code_sent_at: new Date().toISOString() }).eq("id", user.id);
    const secret = (await db.from("app_secrets").select("value").eq("key", "rh_email_secret").maybeSingle()).data?.value;
    const lang = b.lang === "es" ? "es" : "en";
    const subj = lang === "es" ? `Tu código de RealHunt Score: ${code}` : `Your RealHunt Score code: ${code}`;
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#14181c"><p>${lang === "es" ? "Tu código para activar tu cuenta gratis de RealHunt Score:" : "Your code to activate your free RealHunt Score account:"}</p><p style="font-size:34px;font-weight:800;letter-spacing:6px">${code}</p><p style="color:#5b636b;font-size:13px">${lang === "es" ? "Caduca en 15 minutos. Si no lo has pedido tú, ignora este email." : "It expires in 15 minutes. If you didn't ask for it, ignore this email."}</p></body></html>`;
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") || ""}` },
      body: JSON.stringify({ secret, to: email, subject: subj, html, label: "confirm-ext-score" }) });
    return json({ ok: r.ok });
  }

  if (b.action === "verify_check") {
    if (!user) return json({ error: "consent" }, 403);
    const u = (await db.from("ext_users").select("pending_email,code_hash,code_exp,code_tries").eq("id", user.id).maybeSingle()).data;
    if (!u?.code_hash || !u.pending_email || new Date(u.code_exp).getTime() < Date.now()) return json({ error: "expired" }, 400);
    if ((u.code_tries || 0) >= 5) return json({ error: "tries" }, 429);
    if ((await sha(String(b.code || "").trim() + user.id)) !== u.code_hash) { await db.from("ext_users").update({ code_tries: (u.code_tries || 0) + 1 }).eq("id", user.id); return json({ error: "code" }, 400); }
    await db.from("ext_users").update({ email: null }).eq("email", u.pending_email).neq("id", user.id); // one account per email: the verified one wins
    await db.from("ext_users").update({ email: u.pending_email, email_verified_at: new Date().toISOString(), pending_email: null, code_hash: null, code_exp: null, marketing_ok: !!b.marketing, phone: b.phone ? String(b.phone).slice(0, 30) : null }).eq("id", user.id);
    await db.from("ext_events").insert({ user_id: user.id, kind: "signup" });
    return json({ ok: true, email: u.pending_email });
  }
  return json({ error: "action" }, 400);
});
