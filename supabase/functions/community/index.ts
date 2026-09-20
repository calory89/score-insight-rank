// RealHunt community ranking service.
//
// Everything that can inflate a score lives here, behind the service role:
//  - anonymous visitors get a server-signed identity (HMAC), so a client cannot invent one
//  - one active vote per (deal, visitor) is enforced by a unique index + a single atomic upsert
//  - direction changes update in place, repeats are no-ops, concurrent replays cannot double count
//  - sign-in merges the anonymous vote into the account vote without ever counting both
//  - rate limits and burst/pattern checks run per identity and per network, not IP alone
//
// The browser never writes votes, views or aggregates directly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const headers = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

// ---------- signed anonymous identity ----------
let cachedSecret: CryptoKey | null = null;
async function secretKey(): Promise<CryptoKey> {
  if (cachedSecret) return cachedSecret;
  const { data, error } = await admin.from("app_secrets").select("value").eq("key", "community_vote_secret").maybeSingle();
  if (error || !data?.value) throw new Error("identity secret unavailable");
  cachedSecret = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(data.value),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
  return cachedSecret;
}

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(vid: string) {
  return b64url(await crypto.subtle.sign("HMAC", await secretKey(), new TextEncoder().encode(vid)));
}
async function verifyVisitor(vid: unknown, token: unknown): Promise<string | null> {
  if (typeof vid !== "string" || typeof token !== "string") return null;
  if (!/^[0-9a-f]{32}$/.test(vid)) return null;
  const expected = await sign(vid);
  // Constant-time-ish compare.
  if (expected.length !== token.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0 ? vid : null;
}

async function currentUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const scoped = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await scoped.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

// ---------- rate limiting ----------
// Per-isolate burst guard keyed by network + identity. The durable limits below are
// enforced against the database, so restarting an isolate does not reset them.
const burst = new Map<string, number[]>();
function burstOk(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (burst.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  burst.set(key, hits);
  if (burst.size > 5000) burst.clear();
  return hits.length <= max;
}

async function rateOk(voterKey: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const hour = new Date(Date.now() - 3_600_000).toISOString();
  const [{ count: perMinute }, { count: perHour }, { data: spread }] = await Promise.all([
    admin.from("community_votes").select("id", { count: "exact", head: true }).eq("voter_key", voterKey).gte("updated_at", since),
    admin.from("community_votes").select("id", { count: "exact", head: true }).eq("voter_key", voterKey).gte("updated_at", hour),
    admin.from("community_votes").select("deal_id").eq("voter_key", voterKey).gte("created_at", new Date(Date.now() - 600_000).toISOString()).limit(100),
  ]);
  if ((perMinute ?? 0) >= 15) return "Too many votes in a minute. Give it a moment.";
  if ((perHour ?? 0) >= 200) return "Too many votes this hour.";
  if ((spread?.length ?? 0) >= 60) return "That looks automated. Voting is paused for a few minutes.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").filter(Boolean).pop();
    const network = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // --- issue a signed visitor identity ---
    if (action === "identity") {
      if (!burstOk(`id:${network}`, 30, 60_000)) return json({ error: "Slow down." }, 429);
      const vid = crypto.randomUUID().replace(/-/g, "");
      return json({ vid, token: await sign(vid) });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const userId = await currentUser(req);
    const vid = await verifyVisitor(body.vid, body.token);
    if (!userId && !vid) return json({ error: "Missing a valid visitor identity." }, 401);
    const voterKey = userId ? `u:${userId}` : `a:${vid}`;

    // --- vote ---
    if (action === "vote") {
      const dealId = String(body.deal_id ?? "");
      const value = Number(body.value);
      if (!/^[0-9a-f-]{36}$/.test(dealId)) return json({ error: "Unknown property." }, 400);
      if (![1, -1, 0].includes(value)) return json({ error: "Invalid vote." }, 400);
      if (!burstOk(`v:${network}:${voterKey}`, 20, 60_000)) return json({ error: "Too fast. Try again in a moment." }, 429);
      if (!burstOk(`n:${network}`, 120, 60_000)) return json({ error: "Too many votes from this network right now." }, 429);
      const limited = await rateOk(voterKey);
      if (limited) return json({ error: limited }, 429);

      const { data, error } = await admin.rpc("community_cast_vote", {
        p_deal: dealId, p_voter: voterKey, p_user: userId, p_value: value,
      });
      if (error) return json({ error: "Your vote did not save. Try again." }, 500);
      return json(data);
    }

    // --- merge an anonymous history into the signed-in account ---
    if (action === "merge") {
      if (!userId) return json({ error: "Not signed in." }, 401);
      if (!vid) return json({ ok: true, moved: 0 });
      const { data, error } = await admin.rpc("community_merge_votes", { p_user: userId, p_anon: `a:${vid}` });
      if (error) return json({ error: "Could not merge votes." }, 500);
      return json(data);
    }

    // --- de-duplicated view counter ---
    if (action === "view") {
      const dealId = String(body.deal_id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(dealId)) return json({ error: "Unknown property." }, 400);
      if (!burstOk(`w:${voterKey}`, 60, 60_000)) return json({ ok: true, skipped: true });
      await admin.rpc("community_record_view", { p_deal: dealId, p_voter: voterKey });
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 404);
  } catch (e) {
    console.error("community error", e instanceof Error ? e.message : e);
    return json({ error: "Something went wrong." }, 500);
  }
});
