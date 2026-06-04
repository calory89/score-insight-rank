// Idempotently credits a referral after a new user signs up via ?ref=CODE.
// - Looks up the referrer by profiles.referral_code
// - Inserts a row in public.referrals (UNIQUE(referred_id) makes this idempotent)
// - Adds +5 credits_total to BOTH the referrer and the referred user's subscription
// - Only grants credits when the referral row is newly created (bonus_granted=false→true)
//
// Requires Authorization header (the newly-signed-in user calls this).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REWARD = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.code || "").trim().toUpperCase();
    if (!rawCode || !/^[A-Z0-9]{4,16}$/.test(rawCode)) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Find referrer by code
    const { data: refProfile } = await admin
      .from("profiles")
      .select("user_id, referral_code")
      .eq("referral_code", rawCode)
      .maybeSingle();

    if (!refProfile?.user_id) {
      return new Response(JSON.stringify({ ok: false, reason: "code_not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (refProfile.user_id === userId) {
      return new Response(JSON.stringify({ ok: false, reason: "self_referral" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Anti-abuse: only credit if the referred user signed up recently (<48h)
    const { data: refdProfile } = await admin
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (refdProfile?.created_at) {
      const age = Date.now() - new Date(refdProfile.created_at as string).getTime();
      if (age > 1000 * 60 * 60 * 48) {
        return new Response(JSON.stringify({ ok: false, reason: "too_late" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Idempotent insert — referrals.referred_id is UNIQUE
    const { data: inserted, error: insErr } = await admin
      .from("referrals")
      .insert({
        referrer_id: refProfile.user_id,
        referred_id: userId,
        referral_code: rawCode,
        bonus_granted: false,
      })
      .select("id, bonus_granted")
      .maybeSingle();

    if (insErr) {
      // Most likely already exists → not a new referral, do not double-credit.
      return new Response(JSON.stringify({ ok: false, reason: "already_referred" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!inserted) {
      return new Response(JSON.stringify({ ok: false, reason: "no_insert" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Grant +REWARD credits to BOTH users (only when bonus_granted was false)
    const grant = async (uid: string) => {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id, credits_total")
        .eq("user_id", uid)
        .maybeSingle();
      if (sub?.id) {
        await admin
          .from("subscriptions")
          .update({ credits_total: (sub.credits_total ?? 5) + REWARD })
          .eq("id", sub.id);
      } else {
        // Create a default free subscription with the bonus baked in
        await admin.from("subscriptions").insert({
          user_id: uid,
          plan: "free",
          credits_total: 5 + REWARD,
          credits_used: 0,
        });
      }
    };

    await grant(refProfile.user_id);
    await grant(userId);

    await admin.from("referrals").update({ bonus_granted: true }).eq("id", inserted.id);

    return new Response(JSON.stringify({ ok: true, reward: REWARD }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apply-referral error:", e);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
