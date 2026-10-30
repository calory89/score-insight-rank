// RealHunt Score — side panel: full breakdown, consent, 5-question profile, free account, labelled
// recommendations, share card, delete my data.
const RHS = window.RHS;
const T = (k, s) => chrome.i18n.getMessage(k, s) || k;
const send = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(chrome.runtime.lastError ? null : r)));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const app = document.getElementById("app");
const PRIVACY = "https://realhunt.co/extension/privacy";

let cmp = [], recent = [], notes = {}, contrib = null;
let st = null, report = null, step = -1, draft = {}, pending = null; // pending = {email, mk, ph} while waiting for the code
const QUESTIONS = [
  { k: "budget", q: "q_budget", opts: [[80000, "≤ 80k"], [150000, "≤ 150k"], [250000, "≤ 250k"], [400000, "≤ 400k"], [800000, "≤ 800k"], [2000000, "800k +"]] },
  { k: "places", q: "q_places", multi: true, opts: [["spain", "Spain"], ["portugal", "Portugal"], ["italy", "Italy"], ["united kingdom", "UK"], ["united states", "USA"], ["denmark", "Denmark"], ["france", "France"], ["indonesia", "Indonesia"]] },
  { k: "ptype", q: "q_type", opts: [["flat", "o_flat"], ["house", "o_house"], ["any", "o_any"]] },
  { k: "purpose", q: "q_purpose", opts: [["live", "o_live"], ["second_home", "o_second"], ["invest", "o_invest"]] },
  { k: "timeline", q: "q_timeline", opts: [["3m", "o_3m"], ["12m", "o_12m"], ["browsing", "o_browsing"]] },
];

async function load() {
  st = await send({ t: "state" });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const ss = await chrome.storage.session.get(["report:" + (tab && tab.id), "lastReport"]);
  report = ss["report:" + (tab && tab.id)] || null;
  const cl = await send({ t: "compare", op: "list" }); cmp = (cl && cl.list) || [];
  recent = (await send({ t: "seen" })) || []; notes = (await chrome.storage.local.get("notes")).notes || {};
  contrib = await send({ t: "contrib" });
  render();
}
chrome.storage.session.onChanged.addListener(() => load());
chrome.storage.local.onChanged.addListener((ch) => { if (ch.recent || ch.notes || ch.compare) { clearTimeout(load.t); load.t = setTimeout(load, 600); } });
chrome.tabs.onActivated.addListener(() => load());

function partsHtml(r) {
  return r.parts.map((p) => `<div class="r"><div class="l"><span>${esc(T("part_" + p.k))}</span><span>${p.pending ? "…" : p.pts + "/" + p.max}</span></div><div class="bar"><i style="width:${Math.round((p.pts / p.max) * 100)}%;background:${RHS.color((p.pts / p.max) * 100)}"></i></div><p>${esc(p.why)}</p></div>`).join("");
}

function render() {
  let h = "";
  if (!st.consent) {
    h += `<section class="box"><h2>${esc(T("consent_title"))}</h2><p class="muted">${esc(T("consent_body"))}</p>
      <div class="row"><button data-a="consent">${esc(T("allow"))}</button><a class="btn" style="background:#eef0f2;color:#14181c" href="${PRIVACY}" target="_blank">${esc(T("privacy"))}</a></div></section>`;
  }
  if (report) {
    const gated = !st.email && st.quotaLeft <= 0;
    h += `<section><div class="score"><div class="s" style="background:${RHS.color(report.score)}">${report.score}<small>${esc(report.grade || RHS.grade(report.score))}</small></div><div><b>${esc(report.verdict || report.area || "")}</b><div class="muted">${esc(report.area || "")}</div><div class="muted">${esc(RHS.money(report.price, report.currency))}${report.sqm ? " · " + report.sqm + " m²" : ""}${report.ppsqm ? " · " + RHS.money(report.ppsqm, report.currency) + "/m²" : ""}</div></div></div>
      ${gated ? `<div class="box">${esc(T("gate"))}</div>` : partsHtml(report)}
      <p class="muted">${esc(T("disclaimer"))}</p>
      <div class="row"><button data-a="share">${esc(T("share"))}</button><button class="ghost" data-a="save">${esc(T("save"))}</button></div><div id="share"></div></section>`;
  } else {
    h += `<section><h2>${esc(T("no_report_title"))}</h2><p class="muted">${esc(T("no_report_body"))}</p></section>`;
  }
  if (!st.email && pending) {
    h += `<section class="box"><h2>${esc(T("code_title"))}</h2><p class="muted">${esc(T("code_sent", [pending.email]))}</p>
      <input id="cd" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code">
      <div class="row"><button data-a="code">${esc(T("code_cta"))}</button><button class="ghost" data-a="back">${esc(T("change_email"))}</button></div><p class="muted" id="sm"></p></section>`;
  } else if (!st.email) {
    h += `<section class="box"><span class="free">${esc(T("free_badge") || "FREE")}</span><h2>${esc(T("signup_title"))}</h2><p class="muted">${esc(T("signup_body"))}</p>
      <input id="em" type="email" placeholder="you@email.com" autocomplete="email"><input id="ph" type="tel" placeholder="${esc(T("phone_optional"))}">
      <label class="ck"><input id="mk" type="checkbox"> <span>${esc(T("marketing_ok"))}</span></label>
      <button data-a="signup">${esc(T("signup_cta"))}</button><p class="muted">${esc(T("unlock_fine"))}</p><p class="muted" id="sm"></p></section>`;
  }
  if (st.consent) {
    if (step >= 0 && step < QUESTIONS.length) {
      const q = QUESTIONS[step]; const cur = draft[q.k];
      h += `<section class="box"><div class="prog"><i style="width:${Math.round(((step + 1) / QUESTIONS.length) * 100)}%"></i></div><div class="q">${esc(T(q.q))}</div>
        <div class="chips">${q.opts.map(([v, l]) => `<button data-a="ans" data-v="${esc(v)}" aria-pressed="${q.multi ? (cur || []).includes(v) : cur == v}">${esc(T(l) === l ? l : T(l))}</button>`).join("")}</div>
        ${q.multi ? `<button data-a="next">${esc(T("next"))}</button>` : ""}<button class="link" data-a="skip">${esc(T("skip"))}</button></section>`;
    } else if (!st.profile) {
      h += `<section><h2>${esc(T("profile_title"))}</h2><p class="muted">${esc(T("profile_body"))}</p><button data-a="start">${esc(T("profile_cta"))}</button></section>`;
    } else {
      h += `<section><h2>${esc(T("reco_title"))}</h2><div id="reco" class="muted">…</div><button class="link" data-a="start">${esc(T("profile_edit"))}</button></section>`;
    }
  }
  if (st.consent) h += `<section><h2>${esc(T("saved_title"))}</h2><div id="saved" class="muted">…</div></section>`;
  if (cmp.length) h += `<section><h2>⇄ ${esc(T("compare"))} (${cmp.length}/4)</h2><ul class="cmp">${cmp.map((x) => `<li><a href="${esc(x.url)}" target="_blank">${esc(RHS.money(x.price, x.cur))}${x.sqm ? " · " + x.sqm + " m²" : ""}</a> <b>${x.score ?? ""}</b> <button class="link" data-a="cmpdel" data-u="${esc(x.url)}">×</button></li>`).join("")}</ul>
    <div class="row">${cmp.length >= 2 ? `<button data-a="cmpopen">${esc(T("compare"))} →</button>` : `<p class="muted">${esc(T("compare_hint"))}</p>`}<button class="ghost" data-a="cmpclear">${esc(T("compare_clear"))}</button></div><p class="muted" id="cmpm"></p></section>`;
  // v0.7: homes you opened recently, with your 👍/👎 and notes (kept in this browser)
  // v0.10: what you've added to RealHunt, and the taste learned from your 👍
  if (contrib && contrib.homes) h += `<section><h2>🌍 ${esc(T("contrib_title"))}</h2><p>${esc(T("contrib_line", [String(contrib.homes), String(contrib.top || 0)]))}</p><a href="https://realhunt.co/best?utm_source=extension&utm_medium=panel" target="_blank">realhunt.co/best →</a></section>`;
  for (const deal of ["sale", "rent"]) {
    const tl = RHS.learnTaste ? RHS.learnTaste(notes, deal) : null;
    if (tl) h += `<section><h2>✨ ${esc(T(deal === "rent" ? "taste_title_rent" : "taste_title"))}</h2><p>${esc(T("taste_line", [String(tl.n), RHS.money(tl.budget, tl.cur), tl.rooms ? String(tl.rooms) : "–", tl.places.length ? tl.places.join(", ") : "–"]))}</p><p class="muted">${esc(T("taste_note"))}</p></section>`;
  }
  if (recent.length) {
    const byHash = notes; const liked = recent.filter((x) => byHash[x.hash] && byHash[x.hash].like === 1);
    const row = (x) => { const n = byHash[x.hash] || {}; return `<li><a href="${esc(x.url)}" target="_blank">${esc(RHS.money(x.price, x.cur))}${x.sqm ? " · " + x.sqm + " m²" : x.rooms ? " · " + x.rooms + " " + esc(T("rank_rooms")) : ""}</a> <b>${x.score ?? ""}</b>${n.like === 1 ? " 👍" : n.like === -1 ? " 👎" : ""}${n.text ? ` <span class="muted">📝 ${esc(n.text.slice(0, 40))}</span>` : ""}<br><span class="muted">${esc((x.title || "").slice(0, 60))} · ${esc(RHS.portalName(x.portal))}</span></li>`; };
    if (liked.length) h += `<section><h2>👍 ${esc(T("liked"))} (${liked.length})</h2><ul class="cmp">${liked.slice(0, 10).map(row).join("")}</ul></section>`;
    h += `<section><h2>👁 ${esc(T("recent_title"))}</h2><ul class="cmp">${recent.slice(0, 12).map(row).join("")}</ul></section>`;
  }
  h += `<section class="muted">${st.email ? esc(T("signed_as", [st.email])) + " · " : ""}<button class="link" data-a="delete">${esc(T("delete"))}</button> · <a href="${PRIVACY}" target="_blank" style="color:inherit">${esc(T("privacy"))}</a></section>`;
  app.innerHTML = h;
  if (st.profile && document.getElementById("reco")) loadReco();
  if (document.getElementById("saved")) loadSaved();
}

async function loadSaved() {
  const el = document.getElementById("saved");
  const rows = (await send({ t: "saved" })) || [];
  if (!rows.length) { el.textContent = T("saved_none"); return; }
  el.classList.remove("muted");
  el.innerHTML = rows.map((r) => {
    const d = r.price_saved && r.price_now ? Math.round((r.price_now / r.price_saved - 1) * 100) : 0;
    const tag = d < 0 ? `<span class="drop">▼ ${-d}%</span>` : d > 0 ? `<span class="up">▲ ${d}%</span>` : "";
    return `<a class="reco" href="${esc(r.url || "#")}" target="_blank"><div class="sc" style="background:${RHS.color(r.score || 0)}">${r.score ?? "–"}</div><div><b style="text-transform:capitalize">${esc(r.area || r.portal || "")}</b><span class="muted">${esc(RHS.money(+r.price_now || +r.price_saved, r.currency || "EUR"))}${r.sqm ? " · " + Math.round(r.sqm) + " m²" : ""} ${tag}</span></div></a>`;
  }).join("");
}

async function loadReco() {
  const el = document.getElementById("reco");
  const rows = (await send({ t: "recommend" })) || [];
  if (!rows.length) { el.textContent = T("reco_none"); return; }
  send({ t: "track", kind: "reco_view", meta: { n: rows.length } });
  el.innerHTML = rows.map((r, i) => `<a class="reco" href="${esc(r.url)}" target="_blank" data-i="${i}">${r.image ? `<img src="${esc(r.image)}" alt="">` : `<img alt="">`}<div><span class="lab">${esc(r.label)}</span><b>${esc(r.title)}</b><span class="muted">${esc(RHS.money(+r.price, "EUR"))} · ${esc(r.place)}${r.score ? " · " + T("realhunt_grade", [String(r.score)]) : ""}</span></div></a>`).join("");
  el.querySelectorAll("a.reco").forEach((a) => a.addEventListener("click", () => send({ t: "track", kind: "reco_click", meta: { url: a.href } })));
}

function shareCard() {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, "#0b3d22"); g.addColorStop(1, "#1d7a46"); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.globalAlpha = .08; x.fillStyle = "#fff"; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(900 - i * 40, 200 + i * 130, 220, 0, 7); x.fill(); } x.globalAlpha = 1;
  x.fillStyle = "#fff"; x.font = "700 44px system-ui"; x.fillText("RealHunt Score", 80, 130);
  x.font = "500 38px system-ui"; x.fillStyle = "rgba(255,255,255,.85)";
  x.fillText(`${report.area || ""}`.slice(0, 38), 80, 200);
  x.fillText(`${RHS.money(report.price, report.currency)}${report.sqm ? " · " + report.sqm + " m²" : ""}`, 80, 255);
  x.fillStyle = "#fff"; x.beginPath(); x.arc(540, 560, 200, 0, 7); x.fill();
  x.strokeStyle = RHS.color(report.score); x.lineWidth = 22; x.beginPath(); x.arc(540, 560, 178, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * report.score) / 100); x.stroke();
  x.fillStyle = RHS.color(report.score); x.textAlign = "center"; x.font = "800 170px system-ui"; x.fillText(String(report.score), 540, 615);
  x.font = "700 34px system-ui"; x.fillText("/ 100 · " + (report.grade || RHS.grade(report.score)), 540, 680);
  x.fillStyle = "#fff"; x.font = "700 38px system-ui"; const v = String(report.verdict || ""); const words = v.split(" "); let line = "", ly = 825; for (const w of words) { if (x.measureText(line + w).width > 920) { x.fillText(line.trim(), 540, ly); line = ""; ly += 48; } line += w + " "; } if (line.trim()) x.fillText(line.trim(), 540, ly);
  x.textAlign = "left";
  const items = (report.flags && report.flags.length ? report.flags.map((f) => "⚠ " + f) : [...report.parts].sort((a, b) => b.pts / b.max - a.pts / a.max).map((p) => "✓ " + T("part_" + p.k) + ` ${p.pts}/${p.max}`)).slice(0, 3);
  x.font = "600 36px system-ui"; items.forEach((t, i) => { x.fillStyle = "rgba(255,255,255,.92)"; x.fillText(t.slice(0, 44), 80, 985 + i * 60); });
  x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(0, 1170, 1080, 180);
  x.fillStyle = "#fff"; x.font = "700 42px system-ui"; x.fillText(T("share_footer"), 80, 1250); x.font = "500 32px system-ui"; x.fillText("realhunt.co/extension", 80, 1300);
  return c;
}

app.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
  if (a === "consent") { await send({ t: "consent" }); return load(); }
  if (a === "cmpdel") { await send({ t: "compare", op: "remove", url: b.dataset.u }); return load(); }
  if (a === "cmpclear") { await send({ t: "compare", op: "clear" }); return load(); }
  if (a === "cmpopen") { const r = await send({ t: "compare", op: "open" }); const m = document.getElementById("cmpm"); if (m && (!r || r.error)) m.textContent = T(r && r.error === "few" ? "compare_hint" : "try_again"); return; }
  if (a === "save" && report) { await send({ t: "track", kind: "save", hash: report.hash, price: report.price }); b.textContent = T("saved"); }
  if (a === "share" && report) {
    const c = shareCard(); const box = document.getElementById("share"); box.innerHTML = ""; box.appendChild(c);
    const link = document.createElement("a"); link.className = "btn"; link.style.marginTop = "8px"; link.download = `realhunt-score-${report.score}.png`; link.href = c.toDataURL("image/png"); link.textContent = T("download_image");
    box.appendChild(link); send({ t: "track", kind: "share", hash: report.hash });
  }
  if (a === "signup") {
    const em = document.getElementById("em").value.trim(); const ph = document.getElementById("ph").value.trim(); const mk = document.getElementById("mk").checked;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { document.getElementById("sm").textContent = T("bad_email"); return; }
    if (!st.consent) await send({ t: "consent" });
    b.disabled = true;
    const r = await send({ t: "verifyStart", email: em, lang: RHS.lang });
    if (r && r.ok) { pending = { email: em, mk, ph }; return load(); }
    b.disabled = false; document.getElementById("sm").textContent = r && r.error === "wait" ? T("wait_code") : T("try_again");
  }
  if (a === "back") { pending = null; return load(); }
  if (a === "code") {
    const r = await send({ t: "verifyCheck", code: document.getElementById("cd").value.replace(/\D/g, ""), marketing: pending.mk, phone: pending.ph });
    if (r && r.ok) { pending = null; step = 0; send({ t: "track", kind: "lead" }); return load(); }
    document.getElementById("sm").textContent = r && r.error === "expired" ? T("code_expired") : T("code_wrong");
  }
  if (a === "start") { step = 0; draft = { ...(st.profile || {}) }; render(); }
  if (a === "ans") {
    const q = QUESTIONS[step]; const raw = b.dataset.v; const v = typeof q.opts[0][0] === "number" ? Number(raw) : raw;
    if (q.multi) { const cur = draft[q.k] || []; draft[q.k] = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]; render(); return; }
    draft[q.k] = v; next();
  }
  if (a === "next" || a === "skip") next();
  if (a === "delete") { if (confirm(T("delete_confirm"))) { await send({ t: "deleteMe" }); step = -1; draft = {}; load(); } }
});
async function next() {
  step++;
  if (step >= QUESTIONS.length) { step = -1; await send({ t: "profile", profile: draft }); return load(); }
  render();
}
load();
// v0.14.3: clicking the RealHunt icon opens this panel; that is the person asking for the card again on this website
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => { if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { t: "rhsOpen" }).catch(() => {}); }).catch(() => {});
