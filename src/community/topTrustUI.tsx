// Trust layer of the Top 100 (30-sep-2026): how we rank, how we make money, what verification checked,
// the legal checklist per destination, review dates and error reports, public Q&A, price per m² against the area,
// our own visits, independent lawyers, and the About page.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sid } from "@/lib/rh";
import { useCommunity } from "./ctx";
import { Lightbox } from "./extras";
import { TOP_TRUST } from "./topTrust";
import { DIMS, TOP_DESTS, TOP_ORDER, areaOf } from "./top";
import { AlertTriangle, BadgeCheck, BarChart3, Camera, CheckCircle2, CircleHelp, Coins, ExternalLink, Flag, Mail, MapPin, MessageCircle, Scale, ShieldCheck, Star, Trophy, Users, XCircle } from "lucide-react";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => { const { data, error } = await (supabase as any).rpc(fn, args); if (error) throw error; return data; };
const eur = (n?: number | null) => (n == null ? "–" : "€" + Math.round(n).toLocaleString("en-GB"));
const day = (d?: string | null) => (d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
export const REPLY_DAYS = 3;

// ---------------------------------------------------------------- how we make money
export function MoneyNote({ compact }: { compact?: boolean }) {
  return (
    <div className="tp-trust-box tp-money">
      <Coins size={20} />
      <div>
        <strong>How RealHunt makes money</strong>
        <p>Buyers pay nothing. Developers pay nothing to be listed, to verify or to rank. We earn 5% from the developer only if a buyer we introduced buys. Nobody can pay to be listed or to rank higher.</p>
        {!compact && <p>Verified developers get 100 in listing detail because buyers can reach them directly and we have seen their company papers, not because of any deal with us.</p>}
        <Link className="hunt-link" to="/top/how-we-rank">How we rank</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- what the verification checked
export function VerifiedBox({ p, dest }: { p: any; dest: string }) {
  const T = TOP_TRUST[dest]; const D = TOP_DESTS[dest];
  if (!p.verified) return (
    <div className="tp-trust-box is-muted">
      <ShieldCheck size={20} />
      <div>
        <strong>Not verified yet</strong>
        <p>What we checked so far: the developer's website works and has a phone or WhatsApp (reviewed {day(p.reviewed_at)}). We have not seen the company papers yet, so check the company yourself before you pay anything.</p>
        {T && <a className="hunt-link" href={T.company.url} target="_blank" rel="noopener">Look up the company on {T.company.name} <ExternalLink size={12} /></a>}
      </div>
    </div>
  );
  return (
    <div className="tp-trust-box is-ok">
      <BadgeCheck size={20} />
      <div>
        <strong>Verified developer: what we checked</strong>
        <ul className="tp-checks">
          <li><CheckCircle2 size={15} /> Company: <b>{p.ver_legal_name || p.developer}</b></li>
          <li>{p.ver_reg ? <CheckCircle2 size={15} /> : <CircleHelp size={15} />} Registration number ({D.reg}): <b>{p.ver_reg || "seen on the documents, not published"}</b>{T && <> · <a href={T.company.url} target="_blank" rel="noopener">check it on {host(T.company.url)}</a></>}</li>
          <li>{p.ver_license ? <CheckCircle2 size={15} /> : <CircleHelp size={15} />} Licence or permit: <b>{p.ver_license || "not checked yet"}</b></li>
          <li><CheckCircle2 size={15} /> A person from the company showed documents that link them to {p.name}</li>
        </ul>
        <small>Checked by RealHunt on {day(p.verified_at)}. Verification confirms the company exists and runs this page. It is not a guarantee about the build or the contract.</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- legal checklist + independent lawyers
export function LegalBox({ p, dest }: { p: any; dest: string }) {
  const T = TOP_TRUST[dest]; const D = TOP_DESTS[dest];
  if (!T) return null;
  const permit = p.permit_status === "yes" ? <><CheckCircle2 size={15} className="is-ok" /> Confirmed{p.permit_ref ? `: ${p.permit_ref}` : ""}</>
    : p.permit_status === "no" ? <><XCircle size={15} className="is-bad" /> No permit yet, according to the developer</>
    : <><CircleHelp size={15} /> Not confirmed by RealHunt yet. Ask the developer for {D.permit}</>;
  return (
    <section className="tp-legal">
      <h2><Scale size={20} /> Before you buy in {D.name}: legal checklist</h2>
      <dl className="tp-legal-dl">
        <div><dt>What you would own</dt><dd>{p.ownership ? p.ownership : <><CircleHelp size={15} /> Not published. Ask what you actually get: freehold, leasehold or right of use, and for how many years.</>}</dd></div>
        <div><dt>Building permit</dt><dd>{permit}{T.permit ? <> · <a href={T.permit.url} target="_blank" rel="noopener">{host(T.permit.url)}</a></> : null}</dd></div>
        <div><dt>The company</dt><dd>{p.verified ? <><BadgeCheck size={15} className="is-ok" /> Verified by RealHunt</> : <><CircleHelp size={15} /> Not verified yet</>} · <a href={T.company.url} target="_blank" rel="noopener">{T.company.name}</a></dd></div>
        <div><dt>The land title</dt><dd>Ask for the title or trust documents and check them: <a href={T.land.url} target="_blank" rel="noopener">{T.land.name}</a></dd></div>
      </dl>
      {T.permitNote && <p className="hunt-fine">{T.permitNote}</p>}
      <details className="tp-how">
        <summary><AlertTriangle size={14} /> What every foreign buyer in {D.name} should know ({T.checklist.length})</summary>
        <ul className="tp-law">{T.checklist.map((c) => <li key={c.title}><b>{c.title}.</b> {c.text} <a href={c.source} target="_blank" rel="noopener nofollow">Source</a></li>)}</ul>
      </details>
      <div className="tp-lawyers">
        <strong>Independent lawyers in {D.name}</strong>
        <p className="hunt-fine">We have no deal with these firms. They do not pay us, we do not pay them and we get nothing if you hire them. We have not reviewed their work: ask for a written quote and choose the lawyer you trust. Never use a lawyer the seller picks for you.</p>
        <ul>{T.lawyers.map((l) => <li key={l.name}><a href={l.url} target="_blank" rel="noopener nofollow">{l.name}</a> <small>{l.city} · {l.focus}</small></li>)}</ul>
      </div>
      <p className="hunt-fine">General information checked on 30 September 2026, not legal advice. Rules change: confirm them with your lawyer.</p>
    </section>
  );
}

// ---------------------------------------------------------------- price per m² against the area
let marketP: Promise<any> | null = null;
const market = () => (marketP ||= fetch("/top/market.json").then((r) => r.json()).catch(() => null));
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function PriceVsArea({ p, dest }: { p: any; dest: string }) {
  const [m, setM] = useState<any>(null);
  useEffect(() => { market().then(setM); }, []);
  if (!p.ppsqm_eur || !m?.dests?.[dest]) return null;
  const rows: [string, number][] = m.dests[dest];
  const area = areaOf(dest, p.locality);
  const inArea = area !== "Other" ? rows.filter(([l]) => areaOf(dest, l) === area).map((r) => r[1]) : [];
  const useArea = inArea.length >= 5;
  const vals = useArea ? inArea : rows.map((r) => r[1]);
  const med = median(vals);
  const diff = Math.round(((p.ppsqm_eur - med) / med) * 100);
  const where = useArea ? area : `all of ${TOP_DESTS[dest].name}`;
  return (
    <div className="tp-trust-box tp-ppm">
      <BarChart3 size={20} />
      <div>
        <strong>{eur(p.ppsqm_eur)} per m² here, against {eur(med)} in {where}</strong>
        <p><span className={"tp-diff " + (diff <= -5 ? "is-ok" : diff >= 5 ? "is-bad" : "")}>{Math.abs(diff) < 5 ? "About the same as the area" : diff < 0 ? `${-diff}% below the area` : `${diff}% above the area`}</span></p>
        <small>Median price per m² of {vals.length} new-build projects we checked in {where}, from developer price lists and public listings on {m.date}. Sea view, finish and land size explain part of the gap.</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- our own visit
export function VisitBadge({ p }: { p: any }) {
  if (!p.visited_at) return null;
  return <span className="tp-badge is-visit"><Camera size={14} /> We visited it · {day(p.visited_at)}</span>;
}
export function VisitBox({ p }: { p: any }) {
  const [lb, setLb] = useState<number | null>(null);
  if (!p.visited_at) return null;
  const ph: string[] = p.visit_photos || [];
  return (
    <section className="tp-trust-box is-visit">
      <Camera size={20} />
      <div>
        <strong>RealHunt visited {p.name} on {day(p.visited_at)}</strong>
        {p.visit_note && <p>{p.visit_note}</p>}
        {ph.length > 0 && <div className="tp-visit-ph">{ph.map((s, i) => <button key={s} onClick={() => setLb(i)} aria-label={`Open visit photo ${i + 1}`}><img src={s} alt={`Our visit to ${p.name}, photo ${i + 1}`} loading="lazy" /></button>)}</div>}
        <small>Photos taken by the RealHunt team on the day of the visit.</small>
      </div>
      {lb !== null && <Lightbox images={ph} start={lb} title={`Our visit to ${p.name}`} onClose={() => setLb(null)} />}
    </section>
  );
}

// ---------------------------------------------------------------- public questions answered by the developer
export function QaList({ p }: { p: any }) {
  const qa: any[] = p.qa || [];
  return (
    <section className="tp-qa">
      <h2><MessageCircle size={20} /> Buyers' questions, answered by the developer</h2>
      {qa.length === 0 ? <p className="hunt-fine">{p.verified ? "No public answers yet. Ask the first question: if you allow it, it appears here with the developer's answer." : "Answers appear here once the developer verifies this page and replies. Only real questions from signed-in buyers, shown with their permission."}</p> : (
        <ul>{qa.map((q, i) => <li key={i}><p className="tp-q"><b>{q.name || "A buyer"}</b> asked on {day(q.at)}:</p><p>{q.message}</p><p className="tp-a"><b>{p.developer}</b> answered on {day(q.answered_at)}:</p><p>{q.answer}</p></li>)}</ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- last review + report an error
const KINDS: [string, string][] = [["price", "The price is wrong"], ["sold", "It is sold out or no longer for sale"], ["photos", "Photos are wrong or not of this project"], ["details", "Size, date or other details are wrong"], ["developer", "Wrong developer or contact"], ["other", "Something else"]];
export function ReviewAndReport({ p, dest }: { p: any; dest: string }) {
  const { user, setNotice } = useCommunity();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "", message: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const r = await rpc("top_report", { p_slug: p.slug, p_kind: f.kind, p_message: f.message, p_email: f.email || null, p_anon: sid() }); if (r?.error) setNotice(r.error); else { setDone(true); setOpen(false); try { (window as any).clarity?.("event", "top_report"); } catch { /* ignore */ } } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  const fixes: any[] = p.corrections || [];
  return (
    <section className="tp-review">
      <p className="tp-review-line"><CheckCircle2 size={15} /> Last reviewed by RealHunt: <b>{day(p.reviewed_at) || TOP_DESTS[dest].date}</b>{p.reports_open > 0 ? <> · {p.reports_open} error report{p.reports_open > 1 ? "s" : ""} being checked</> : null}
        <button className="tp-report-btn" onClick={() => setOpen(!open)}><Flag size={14} /> Report an error</button></p>
      <p className="hunt-fine">We answer every error report within {REPLY_DAYS} working days and show the correction on this page.</p>
      {done && <p className="tp-claim-strip is-done"><CheckCircle2 size={18} /> Thanks. We check it within {REPLY_DAYS} working days{f.email || user ? " and email you the result" : ""}.</p>}
      {open && (
        <form className="hv-form tp-report" onSubmit={send}>
          <strong>What is wrong on this page?</strong>
          <select required value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="">Choose one</option>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <textarea required minLength={5} maxLength={1500} placeholder="What is wrong and, if you know it, what is right. A link helps." value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          {!user && <input type="email" placeholder="Your email, if you want the answer (optional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
          <button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
        </form>
      )}
      {fixes.length > 0 && (
        <details className="tp-how"><summary>Corrections on this page ({fixes.length})</summary>
          <ul className="tp-law">{fixes.map((x, i) => <li key={i}><b>{day(x.resolved_at)}.</b> {x.status === "fixed" ? "Fixed" : "Checked, no change needed"}: {x.response}</li>)}</ul></details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- /top/how-we-rank
const setDoc = (title: string, desc: string, url: string) => {
  document.title = title;
  const set = (sel: string, attr: string, val: string) => document.querySelector(sel)?.setAttribute(attr, val);
  set('meta[name="description"]', "content", desc); set('link[rel="canonical"]', "href", url);
  set('meta[property="og:title"]', "content", title); set('meta[property="og:description"]', "content", desc); set('meta[property="og:url"]', "content", url);
};
const BASE: [string, number, string][] = [
  ["Entry price", 20, "20 for the cheapest entry price among the projects we checked in that destination, 0 for the most expensive, in a straight line between them."],
  ["Price per m²", 25, "25 at or below the cheapest 10% of the destination, 0 at or above the most expensive 10%, in a straight line between them. 9 if the developer does not publish unit sizes."],
  ["Area", 20, "Each area gets a tier from buyer and holiday-guest demand (the busiest beach and town areas score higher), plus 3 points within 500 m of the sea or 1 point within 1.5 km."],
  ["Build stage", 15, "Ready to move in: 15. Completion date already passed: 12. Finishing in 2026: 13. In 2027: 10. In 2028: 7. Later: 4. No date published: 6."],
  ["Listing detail", 10, "Up to 5 for photos (8 or more gives 5), 2 if the type of ownership is published, 2 if unit sizes and prices are listed, 1 if the developer is named."],
  ["Developer track record", 10, "3 points, plus 2 for each project of theirs we found in the destination, up to 10."],
];
export function TopMethodPage() {
  useEffect(() => { window.scrollTo(0, 0); setDoc("How we rank the Top 100 · RealHunt", "The exact formula behind the RealHunt Top 100 rankings, our sources and review dates, and how we make money. Nobody pays to be listed or to rank higher.", "https://realhunt.co/top/how-we-rank"); }, []);
  return (
    <div className="hunt-wrap hunt-page tp tp-method">
      <span className="hunt-eyebrow"><Trophy size={13} /> <Link to="/top">REALHUNT RANKINGS</Link></span>
      <h1>How we rank</h1>
      <p className="tp-pledge">Nobody pays to be listed or to rank higher.</p>
      <p>Here is the whole formula, where the data comes from and when we last checked it, so you can judge the ranking yourself.</p>
      <h2>1. Who can enter</h2>
      <ul className="tp-law">
        <li>A new-build project still for sale, with a published price and at least 4 real photos.</li>
        <li>A named developer with a working website and a phone or WhatsApp. If either is missing, the project cannot be in any ranking.</li>
        <li>At most 3 projects per developer, so no one fills the list.</li>
        <li>We keep up to 100 of the strongest in each destination (fewer where fewer pass, like Koh Samui) on price, price per m², area, build stage, listing detail and developer track record.</li>
      </ul>
      <h2>2. The 10 scores</h2>
      <table className="tp-units tp-formula"><thead><tr><th>Score</th><th>How it is scored (0 to 100)</th></tr></thead>
        <tbody>{DIMS.map(([k, l, h]) => <tr key={k}><td><b>{l}</b></td><td>{h}.</td></tr>)}</tbody></table>
      <p>Price, value per m², space and visitor interest are percentiles: 100 is the best project in that ranking, 0 the weakest. Beach falls with the straight-line distance to the coastline on OpenStreetMap. Facilities adds points for each one the public listing shows: pool, gym, spa, coworking, security, rooftop, restaurant, parking and more.</p>
      <h2>3. Visitor interest</h2>
      <p>Views, clicks to the developer, shares, saves (×3), votes (×5) and questions to the developer (×5), compared with the other projects in the ranking. One vote and one save per person, and a daily cap per visitor stops anyone from inflating a project.</p>
      <p><b>Verified developer.</b> Verification is free: the developer shows us the company registration and a document that links them to the project. Verified projects get 100 in listing detail.</p>
      <h2>4. The grade</h2>
      <p>Grade = the average of the 10 scores, rounded. Nothing else is added. The ranking orders projects by that average.</p>
      <h2>5. Sources and review dates</h2>
      <table className="tp-units"><thead><tr><th>Destination</th><th>Projects checked</th><th>Last full review</th></tr></thead>
        <tbody>{TOP_ORDER.map((k) => <tr key={k}><td><Link to={`/top/${k}`}>{TOP_DESTS[k].name}</Link></td><td>{TOP_DESTS[k].checked}</td><td>{TOP_DESTS[k].date}</td></tr>)}</tbody></table>
      <p>We read developer websites and public listing portals. Every project page links the listing we used and shows the date we last reviewed it. Prices in other currencies are converted to euros at the rate of the review date.</p>
      <h2>6. Errors and corrections</h2>
      <p>Anyone can press "Report an error" on a project page, no account needed. We answer every report within {REPLY_DAYS} working days, and when we fix something the correction is listed on that page with its date.</p>
      <h2>7. What we never do</h2>
      <ul className="tp-law"><li>Sell a place in a ranking, a badge or a "featured" spot.</li><li>Write or pay for reviews. Questions and answers on project pages are from real, signed-in buyers who agreed to show them.</li><li>Sell your details. A question you send goes to that developer only.</li><li>Rank our own projects. RealHunt's founder also runs Eco Beach City (Sumba, Indonesia), and it is never in any Top 100. <Link className="hunt-link" to="/about">About us</Link></li></ul>
      <MoneyNote />
      <p className="hunt-fine">The ranking compares projects on public data. It is not advice to buy. Check the developer, the land title and the permits with an independent lawyer before you pay anything.</p>
    </div>
  );
}

// ---------------------------------------------------------------- /about
const TEAM: { name: string; role: string; photo?: string; linkedin?: string; bio: string }[] = [
  { name: "Carlos de Ory Gordillo", role: "Founder", bio: "" },
];
export function AboutPage() {
  useEffect(() => { window.scrollTo(0, 0); setDoc("About RealHunt: who we are and how we work", "Who runs RealHunt, the company behind it, how we make money and what you should know about our founder before you trust us.", "https://realhunt.co/about"); }, []);
  return (
    <div className="hunt-wrap hunt-page tp tp-about">
      <span className="hunt-eyebrow"><Users size={13} /> ABOUT REALHUNT</span>
      <h1>Who we are</h1>
      <p>RealHunt finds homes and new builds abroad that are good value, and lets buyers rank them. You should know exactly who is behind it before you trust a ranking, so here it is.</p>
      <div className="tp-team is-one">{TEAM.map((t) => (
        <div key={t.name} className="tp-person">
          {t.photo ? <img src={t.photo} alt={t.name} /> : <span className="tp-initials" aria-hidden>{(() => { const w = t.name.split(" ").filter((x, i) => i === 0 || /^[A-Z]/.test(x)); return (w[0][0] + (w[1] || w[0])[0]).toUpperCase(); })()}</span>}
          <div><strong>{t.name}</strong><small>{t.role}</small>{t.bio && <p>{t.bio}</p>}{t.linkedin && <a className="hunt-link" href={t.linkedin} target="_blank" rel="noopener">LinkedIn <ExternalLink size={12} /></a>}</div>
        </div>
      ))}</div>
      <h2>The company</h2>
      <p>RealHunt is run by <b>Equinox Investment Group LLC</b>, 30 N Gould St Ste N, Sheridan, WY 82801, United States. Write to us at <a className="hunt-link" href="mailto:hello@realhunt.co">hello@realhunt.co</a>.</p>
      <MoneyNote />
      <h2>What you will find if you search our founder</h2>
      <p>Carlos de Ory Gordillo also founded Eco Beach City, a property development in Sumba, Indonesia. It is a separate company. If you search his name you will find press coverage about Eco Beach City, including legal complaints from some of its buyers. We would rather you hear it from us than find it on your own.</p>
      <p>What it means for RealHunt: Eco Beach City is never part of any Top 100 ranking, and when an Eco Beach City home appears in the RealHunt feed, it is our founder's own project. If you have questions about any of this, ask us at <a className="hunt-link" href="mailto:hello@realhunt.co">hello@realhunt.co</a>.</p>
      <h2>How we keep the rankings honest</h2>
      <ul className="tp-law">
        <li>The whole formula is public: <Link className="hunt-link" to="/top/how-we-rank">how we rank</Link>.</li>
        <li>Verified badges show what we checked and link to the official registry so you can check it too.</li>
        <li>Every project page shows when we last reviewed it and has a "Report an error" button. We answer within {REPLY_DAYS} working days.</li>
        <li>Each destination has a legal checklist and a list of independent lawyers who have no deal with us.</li>
      </ul>
      <p><Link className="hunt-primary" to="/top"><ShieldCheck size={15} /> See the Top 100 rankings</Link> <a className="hunt-secondary" href="mailto:hello@realhunt.co"><Mail size={15} /> Write to us</a></p>
    </div>
  );
}

// ---------------------------------------------------------------- buyer reviews (good and bad, never filtered) + Google Maps link
const Stars = ({ n, size = 15 }: { n: number; size?: number }) => <span className="tp-stars" aria-label={`${n} out of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} className={i <= Math.round(n) ? "is-on" : ""} />)}</span>;
export function ReviewsBox({ p, dest, onChange }: { p: any; dest: string; onChange: () => void }) {
  const { user, requireUser, setNotice } = useCommunity();
  const R = p.reviews || { list: [], count: 0 };
  const mine = R.mine;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ rating: mine?.rating || 0, body: mine?.body || "", name: mine?.name || "" });
  const [busy, setBusy] = useState(false);
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.developer} ${TOP_DESTS[dest]?.name || ""}`)}`;
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) { requireUser(); return; }
    if (!f.rating) { setNotice("Pick from 1 to 5 stars."); return; }
    setBusy(true);
    try { const r = await rpc("top_review_submit", { p_slug: p.slug, p_rating: f.rating, p_body: f.body, p_name: f.name }); if (r?.error) setNotice(r.error); else { setOpen(false); setNotice("Thanks. Your review is on the page."); try { (window as any).clarity?.("event", "top_review"); } catch { /* ignore */ } onChange(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <section className="tp-reviews">
      <h2><Star size={20} /> Buyer reviews</h2>
      <div className="tp-rev-head">
        {R.count > 0 ? <p><b className="tp-rev-avg">{Number(R.avg).toFixed(1)}</b> <Stars n={Number(R.avg)} /> <span className="hunt-fine">{R.count} review{R.count > 1 ? "s" : ""} on RealHunt</span></p> : <p className="hunt-fine">No reviews yet. If you have dealt with {p.developer}, tell other buyers how it went.</p>}
        <div className="tp-rev-actions">
          <button className="hunt-secondary" onClick={() => { if (!user) { requireUser(); return; } setOpen(!open); }}>{mine ? "Edit your review" : "Write a review"}</button>
          <a className="tp-web" href={gmaps} target="_blank" rel="noopener nofollow"><MapPin size={15} /> {p.developer} on Google Maps</a>
        </div>
      </div>
      {open && (
        <form className="hv-form tp-rev-form" onSubmit={send}>
          <strong>Your review of {p.name}</strong>
          <div className="tp-star-pick" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((i) => <button type="button" key={i} role="radio" aria-checked={f.rating === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} onClick={() => setF({ ...f, rating: i })}><Star size={26} className={i <= f.rating ? "is-on" : ""} /></button>)}</div>
          <input maxLength={60} placeholder="Your first name (shown)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <textarea required minLength={20} maxLength={2000} placeholder="What happened? Visit, answers, contract, payments, build quality, handover…" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          <p className="hunt-fine">Your own experience only, good or bad. No insults and no personal details of anyone. We never remove a review for being negative, only for breaking these rules.</p>
          <button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : mine ? "Update review" : "Publish review"}</button>
        </form>
      )}
      {R.list.length > 0 && <ul className="tp-rev-list">{R.list.map((r: any) => (
        <li key={r.id}>
          <p className="tp-rev-meta"><Stars n={r.rating} size={14} /> <b>{r.name}</b> · {day(r.at)}{r.asked && <span className="tp-rev-badge"><MessageCircle size={12} /> Asked the developer through RealHunt</span>}</p>
          <p>{r.body}</p>
          {r.reply && <div className="tp-rev-reply"><b>Reply from {p.developer}</b> · {day(r.replied_at)}<p>{r.reply}</p></div>}
        </li>
      ))}</ul>}
      <p className="hunt-fine">{p.verified ? `${p.developer} is verified and can reply to every review.` : `Only the verified developer can reply to reviews. ${p.developer} has not verified this page yet.`} Google reviews are on Google Maps: we link to them and do not copy them.</p>
    </section>
  );
}
export function ReviewReply({ r, onSaved }: { r: any; onSaved: () => void }) {
  const { setNotice } = useCommunity();
  const [a, setA] = useState(r.reply || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const x = await rpc("top_review_reply", { p_id: r.id, p_reply: a }); if (x?.error) setNotice(x.error); else { setNotice("Reply published under the review."); onSaved(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="tp-answer">
      <textarea maxLength={2000} placeholder="Your public reply" value={a} onChange={(e) => setA(e.target.value)} />
      <button className="hunt-secondary" disabled={busy || a.trim().length < 2} onClick={save}>{busy ? "Saving…" : r.reply ? "Update reply" : "Publish reply"}</button>
    </div>
  );
}
