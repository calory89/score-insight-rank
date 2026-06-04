// Public "Scored by RealHunt" embeddable badge.
// Usage: <iframe src="https://<project>.supabase.co/functions/v1/embed?slug=xyz" />
//   or: /functions/v1/embed/xyz
// Returns a small self-contained HTML card (cream / brass / serif) with a do-follow
// link back to https://realhunt.co/r/:slug.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const scoreToGrade = (s: number) => {
  if (s >= 95) return "A+"; if (s >= 90) return "A"; if (s >= 85) return "A−";
  if (s >= 80) return "B+"; if (s >= 75) return "B"; if (s >= 70) return "B−";
  if (s >= 65) return "C+"; if (s >= 55) return "C"; if (s >= 45) return "D";
  return "F";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Accept /embed?slug=xyz, /functions/v1/embed?slug=xyz, OR trailing /slug
    let slug = url.searchParams.get("slug") || "";
    if (!slug) {
      const parts = url.pathname.split("/").filter(Boolean);
      slug = parts[parts.length - 1] || "";
      if (slug === "embed") slug = "";
    }
    if (!slug) {
      return new Response("Missing slug", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await supabase
      .from("analyses")
      .select("slug, address, city, country, global_score, verdict, currency, price, property_type")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const score = Number(data.global_score) || 0;
    const grade = scoreToGrade(score);
    const title = data.address || [data.city, data.country].filter(Boolean).join(", ") || "Property";
    const sub = [data.property_type, [data.city, data.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
    const href = `https://realhunt.co/r/${encodeURIComponent(data.slug || slug)}`;
    const scoreColor = score >= 80 ? "#1E6B4F" : score >= 60 ? "#B8893B" : score >= 45 ? "#B7791F" : "#B23A3A";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Scored by RealHunt — ${esc(title)} (${score}/100)</title>
<style>
  :root { color-scheme: light; }
  html,body { margin:0; padding:0; background:transparent; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:#16150F; }
  .card { display:flex; align-items:center; gap:14px; background:#FAF8F3; border:1px solid rgba(22,21,15,0.08);
          border-radius:14px; padding:14px 16px; max-width:520px; box-shadow:0 1px 2px rgba(22,21,15,0.04);
          text-decoration:none; color:inherit; transition:transform .15s ease, box-shadow .15s ease; }
  .card:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(22,21,15,0.08); }
  .ring { position:relative; width:64px; height:64px; flex:0 0 64px; border-radius:50%;
          background:conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(22,21,15,0.08) 0); }
  .ring::after { content:""; position:absolute; inset:5px; border-radius:50%; background:#fff; }
  .ring span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
               font-family:Georgia,"Times New Roman",serif; font-weight:700; font-size:22px; color:#16150F; z-index:1; }
  .body { flex:1; min-width:0; }
  .kicker { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#8A8674; margin-bottom:2px; }
  .title { font-family:Georgia,"Times New Roman",serif; font-weight:600; font-size:15px; line-height:1.25;
           overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .sub { font-size:11px; color:#5C5848; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .meta { display:flex; align-items:center; gap:8px; margin-top:6px; }
  .grade { font-family:Georgia,serif; font-weight:700; font-size:14px; color:${scoreColor}; }
  .dot { width:3px; height:3px; border-radius:50%; background:rgba(22,21,15,0.25); }
  .brand { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:#B8893B; font-weight:700; }
  .verdict { display:inline-block; padding:2px 8px; border-radius:999px; background:${scoreColor}1f; color:${scoreColor};
             font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
</style>
</head>
<body>
  <a class="card" href="${esc(href)}" target="_blank" rel="noopener">
    <div class="ring"><span>${score}</span></div>
    <div class="body">
      <div class="kicker">Scored by RealHunt</div>
      <div class="title">${esc(title)}</div>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
      <div class="meta">
        <span class="grade">Grade ${esc(grade)}</span>
        <span class="dot"></span>
        ${data.verdict ? `<span class="verdict">${esc(String(data.verdict))}</span><span class="dot"></span>` : ""}
        <span class="brand">realhunt.co</span>
      </div>
    </div>
  </a>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        // Allow embedding on any site (badges are meant to be embedded everywhere).
        "X-Frame-Options": "ALLOWALL",
        "Content-Security-Policy": "frame-ancestors *;",
      },
    });
  } catch (e) {
    console.error("embed error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
