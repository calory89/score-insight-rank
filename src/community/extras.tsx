import { QUICK, DIMS } from "./scores";
import {BuyerAlertPreferences} from "./OperationsTools";
import {PropertyImage, RentPreference} from "./BuyerTools";
import {userRent} from "./buyer-state";
// RealHunt v3 features (22-sep-2026): filters, status tags, local price, real cost, gallery, similar
// homes, ask-the-seller, daily drop, swipe, leaderboard, invites, public collections, guides, SEO
// country pages, help buying, alerts (saved only, nothing is emailed until Carlos switches it on),
// install button, language switch and the admin inbox.
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUp, X, ChevronLeft, ChevronRight, MapPin, BadgeCheck, TrendingDown, Sparkles, Clock, Share2, Download, Mail, Check, Trophy, Users, Copy, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { COSTS, totalCost, bumpIx } from "@/lib/rh";
import { categories, money, type Deal } from "./api";
import { useCommunity } from "./ctx";
import { t, LANGS, getLang, setLang, type Lang } from "./i18n";

export type Row = Deal & {
  lat?: number | null; lng?: number | null; verified_at?: string | null; verified_note?: string | null;
  publish_at?: string | null; early?: boolean; price_drop?: number; sold_reports?: number; available_reports?: number;
  imported?: boolean;
};
export type FeedParams = { scope?: string; country?: string; category?: string; max_price?: number | null; min_sqm?: number | null; sort?: string; limit?: number; offset?: number; ids?: string[]; q?: string; terms?: string[]; min_score?: number | null; need?: string[]; dim_min?: Record<string, number> };
// Guest pass: someone who opens an Insider's invite link (?ref=code) sees the Insider homes too, for
// 7 days, so what an Insider shares never shows up blurred. The server checks the code belongs to an
// Insider (community_can_see_early); this only remembers which code the visitor came with.
const GUEST_DAYS = 7;
export function guestRef(): string | null {
  try {
    const u = new URLSearchParams(location.search).get("ref");
    const cur = JSON.parse(localStorage.getItem("rh_guest") || "null");
    if (u && /^[0-9a-f]{8}$/.test(u)) {
      if (!cur || cur.code !== u) localStorage.setItem("rh_guest", JSON.stringify({ code: u, until: Date.now() + GUEST_DAYS * 864e5 }));
      return u;
    }
    if (cur && cur.until > Date.now()) return cur.code;
  } catch { /* ignore */ }
  return null;
}
export function guestDaysLeft(): number {
  try { const cur = JSON.parse(localStorage.getItem("rh_guest") || "null"); return cur ? Math.max(0, Math.ceil((cur.until - Date.now()) / 864e5)) : 0; } catch { return 0; }
}
export async function feed(p: FeedParams) {
  const g = guestRef();
  const { data, error } = await (supabase.rpc as any)("community_feed", { p: g ? { ...p, ref: g } : p });
  if (error) throw new Error("The homes could not load. Please try again.");
  /* A reply without rows (an error object, an old function) must not crash the page. */
  if (!data || !Array.isArray((data as any).rows)) return { ...(data || {}), rows: [], total: 0 } as any;
  return data as { rows: Row[]; total: number; week: any; next_drop: string; countries_count: Record<string, number>; weekly_votes: number; global_votes: number; global_deals: number; countries: string[] };
}
export async function feedAll(p: FeedParams) {
  const first = await feed({ ...p, limit: 100, offset: 0 });
  let rows = first.rows;
  while (rows.length < first.total && rows.length < 1000) {
    const next = await feed({ ...p, limit: 100, offset: rows.length });
    if (!next.rows.length) break;
    rows = rows.concat(next.rows);
  }
  return { ...first, rows };
}
const rpc = async (fn: string, args: Record<string, unknown> = {}) => {
  const { data, error } = await (supabase.rpc as any)(fn, args);
  if (error) throw new Error("Something went wrong. Please try again.");
  if (data?.error) throw new Error(data.error);
  return data;
};
const nf = (n = 0) => new Intl.NumberFormat("en").format(n);

// ---------------------------------------------------------------- titles and sharing
export function niceTitle(d: Pick<Deal, "title" | "location_name" | "country" | "sqm">) {
  let s = (d.title || "").replace(/^\s*€\s?[\d.,]+\s*(k\b)?\s*[·\-–:|]\s*/i, "").trim();
  if (!s || /^property\s*[-–]?\s*\w*$/i.test(s)) s = `${d.sqm ? d.sqm + " m² home" : "Home"} in ${d.location_name || d.country || "Europe"}`;
  return s;
}
export function myRef(): string | null { try { return localStorage.getItem("rh_my_ref"); } catch { return null; } }
export function dealUrl(slug: string) {
  const ref = myRef();
  return `https://realhunt.co/deal/${encodeURIComponent(slug)}${ref ? `?ref=${ref}` : ""}`;
}
export function shareText(d: Row, scope = "all") {
  const price = d.price_eur != null ? money(d.price_eur) : "";
  const rank = d.rank ? ` · #${d.rank} ${scope === "all" ? "all time" : "this week"} on RealHunt` : " on RealHunt";
  return `${niceTitle(d)}${price && !niceTitle(d).includes(price) ? ` for ${price}` : ""}${rank}. ${d.verified_at ? "Team check: "+new Date(d.verified_at).toLocaleDateString("en-GB") : "Availability not independently confirmed"}.`;
}
export async function shareRow(d: Row, scope = "all") {
  const url = dealUrl(d.slug);
  const text = shareText(d, scope);
  if (navigator.share) return navigator.share({ title: niceTitle(d), text, url });
  await navigator.clipboard.writeText(`${text}\n${url}`);
}

// ---------------------------------------------------------------- streak (days in a row with a vote)
export function bumpStreak(): number {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let s = { last: "", days: 0 };
  try { s = JSON.parse(localStorage.getItem("rh_streak") || "{}") || s; } catch { /* ignore */ }
  if (s.last === today) return s.days || 1;
  const days = s.last === y ? (s.days || 0) + 1 : 1;
  try { localStorage.setItem("rh_streak", JSON.stringify({ last: today, days })); } catch { /* ignore */ }
  return days;
}
export function streakNow(): number {
  try {
    const s = JSON.parse(localStorage.getItem("rh_streak") || "{}");
    const today = new Date().toISOString().slice(0, 10), y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    return s.last === today || s.last === y ? s.days || 0 : 0;
  } catch { return 0; }
}

// ---------------------------------------------------------------- local currency and €/m²
const REGION_CCY: Record<string, string> = { US: "USD", GB: "GBP", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", JP: "JPY", AU: "AUD", CA: "CAD", MX: "MXN", BR: "BRL", PL: "PLN", CZ: "CZK", HU: "HUF", IN: "INR", NZ: "NZD", ZA: "ZAR", SG: "SGD", HK: "HKD", IL: "ILS", TR: "TRY", KR: "KRW" };
function visitorCurrency(): string | null {
  const locs = (navigator.languages || [navigator.language || ""]).filter(Boolean);
  for (const l of locs) { const r = l.split("-")[1]?.toUpperCase(); if (r && REGION_CCY[r]) return REGION_CCY[r]; }
  return null;
}
let ratesPromise: Promise<Record<string, number> | null> | null = null;
function rates() {
  if (ratesPromise) return ratesPromise;
  ratesPromise = (async () => {
    try {
      const c = JSON.parse(localStorage.getItem("rh_fx") || "null");
      if (c && Date.now() - c.at < 12 * 3600e3) return c.rates;
    } catch { /* ignore */ }
    try {
      const r = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR");
      const j = await r.json();
      try { localStorage.setItem("rh_fx", JSON.stringify({ at: Date.now(), rates: j.rates })); } catch { /* ignore */ }
      return j.rates;
    } catch { return null; }
  })();
  return ratesPromise;
}
export function LocalPrice({ eur, sqm, compact = false }: { eur: number | null | undefined; sqm?: number | null; compact?: boolean }) {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const ccy = visitorCurrency();
    if (!eur || !ccy) return;
    rates().then((r) => {
      if (!r || !r[ccy]) return;
      setTxt("≈ " + new Intl.NumberFormat(navigator.language, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(eur * r[ccy]));
    });
  }, [eur]);
  const per = eur && sqm ? `€${nf(Math.round(eur / sqm))}/m²` : "";
  if (!txt && !per) return null;
  return <span className={"hunt-localprice" + (compact ? " is-compact" : "")}>{[txt, per].filter(Boolean).join(" · ")}</span>;
}

// ---------------------------------------------------------------- status tags
export function StatusTags({ deal }: { deal: Row }) {
  const tags: { k: string; label: string; icon?: ReactNode }[] = [];
  const when = deal.publish_at || deal.approved_at;
  if (deal.early) tags.push({ k: "early", label: t("Early access"), icon: <Clock size={12} /> });
  else if (when && Date.now() - new Date(when).getTime() < 72 * 3600e3) tags.push({ k: "new", label: t("New"), icon: <Sparkles size={12} /> });
  if ((deal.price_drop || 0) > 0) tags.push({ k: "drop", label: `${t("Price dropped")} ${money(deal.price_drop!)}`, icon: <TrendingDown size={12} /> });
  if (deal.verified_at) tags.push({ k: "verified", label: t("Verified by RealHunt"), icon: <BadgeCheck size={12} /> });
  if ((deal.sold_reports || 0) >= 2 && (deal.sold_reports || 0) > (deal.available_reports || 0)) tags.push({ k: "sold", label: `${t("Reported sold")} (${deal.sold_reports})` });
  if (!tags.length) return null;
  return <div className="hunt-tags">{tags.map((x) => <span key={x.k} className={"hunt-tag hunt-tag-" + x.k}>{x.icon}{x.label}</span>)}</div>;
}
export function VerifiedLine({ deal }: { deal: Row }) {
  if (!deal.verified_at) return null;
  const days = Math.max(0, Math.floor((Date.now() - new Date(deal.verified_at).getTime()) / 86400000));
  return <p className="hunt-verified"><BadgeCheck size={16} /> {t("Verified by RealHunt")} {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}{deal.verified_note ? `: ${deal.verified_note}` : ""}</p>;
}

// ---------------------------------------------------------------- what it really costs
const RUNNING: Record<string, { tax: number; insurance: number; utilities: number; taxName: string; extra?: string }> = {
  Italy: { tax: 350, insurance: 200, utilities: 1200, taxName: "IMU and waste tax" },
  Spain: { tax: 300, insurance: 180, utilities: 1100, taxName: "IBI and waste tax", extra: "Non-residents who do not rent it out also file a small yearly imputed-income tax." },
  Portugal: { tax: 200, insurance: 150, utilities: 1000, taxName: "IMI" },
  "United States": { tax: 1200, insurance: 900, utilities: 2400, taxName: "property tax" },
  Canada: { tax: 1500, insurance: 800, utilities: 2400, taxName: "property tax" },
  Mexico: { tax: 150, insurance: 250, utilities: 900, taxName: "predial" },
  Netherlands: { tax: 450, insurance: 250, utilities: 2400, taxName: "OZB property tax and water board", extra: "Flats also pay a monthly owners' association fee (VvE), usually €150 to €450, shown on each listing." },
  France: { tax: 900, insurance: 200, utilities: 1400, taxName: "taxe foncière", extra: "Flats also pay building charges (charges de copropriété), shown on each listing." },
  Poland: { tax: 60, insurance: 80, utilities: 2000, taxName: "property tax", extra: "Flats also pay a monthly service charge (czynsz) to the building, often 400 to 900 zł, which usually covers heating and water advances." },
  Australia: { tax: 1400, insurance: 900, utilities: 2000, taxName: "council rates" },
};
export function CostPanel({ deal }: { deal: Row }) {
  const [rent, setRent] = useState(() => { return userRent() || 0; });
  useEffect(() => { try { localStorage.setItem("rh_rent", String(rent)); window.dispatchEvent(new Event("rh-rent")); } catch { /* ignore */ } }, [rent]);
  useEffect(()=>{const on=()=>setRent(userRent()||0);window.addEventListener("rh-rent",on);return()=>window.removeEventListener("rh-rent",on);},[]);
  if (deal.price_eur == null) return null;
  const allin = totalCost(deal.price_eur, deal.country) || Math.round(deal.price_eur * 1.06);
  const run = RUNNING[deal.country] || { tax: 300, insurance: 200, utilities: 1200, taxName: "property tax" };
  const yearly = run.tax + run.insurance + run.utilities;
  const reno = deal.category === "renovation" || /to renovate|needs? (some )?(work|renovation|updating)|renovation project|to restore|\bruin|to refurbish|fixer/i.test(deal.title || "");
  const months = rent > 0 ? Math.round(allin / rent) : 0;
  return (
    <section className="hunt-cost" aria-label={t("What it really costs")}>
      <h3>{t("What it really costs")}</h3>
      <dl>
        <div><dt>Asking price</dt><dd>{money(deal.price_eur)}</dd></div>
        <div><dt>Estimated purchase costs</dt><dd>{COSTS[deal.country] ? `+${money(allin - deal.price_eur)}` : `≈ +${money(Math.round(deal.price_eur * 0.06))}`}</dd></div>
        <div className="is-total"><dt>Estimated total before renovation</dt><dd>{money(allin)}</dd></div>
        {reno && deal.sqm ? <div><dt>Renovation, typical range</dt><dd>{money(deal.sqm * 400)}–{money(deal.sqm * 900)}</dd></div> : null}
        <div><dt>Keeping it ({run.taxName}, insurance, basic water and power)</dt><dd>≈ {money(Math.round(yearly / 12))}/month</dd></div>
      </dl>
      <label className="hunt-rent">If you pay rent of <input type="number" min={0} placeholder="800" step={50} value={rent || ""} onChange={(e) => {try{localStorage.setItem("rh_rent_explicit","1");}catch{}setRent(Math.max(0, Number(e.target.value)));}} /> € a month{rent > 0 ? <>, the estimated purchase total equals <strong>{`${months} ${t("months of your rent")}`}</strong>.</> : <span className="hunt-rent-hint">{" "}and see how many months of rent this home is worth.</span>}</label>
      <p className="hunt-fine">{COSTS[deal.country]?.note || "Purchase costs vary by country; we use about 6% until we have local figures."} {run.extra || ""} Running costs are a rough guide for a small house; ask the seller for the real bills.{reno ? " Renovation ranges are ballpark figures; get a local quote." : ""}</p>
    </section>
  );
}

// ---------------------------------------------------------------- fullscreen gallery
export function Lightbox({ images, start = 0, title, onClose }: { images: string[]; start?: number; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;closeRef.current?.focus();return()=>previous?.focus();},[]);
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState<number | null>(null);
  const [origin, setOrigin] = useState("50% 50%");
  useEffect(() => {
    const el = ref.current; if (el) el.scrollLeft = start * el.clientWidth;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", key); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, []);
  const go = (n: number) => { const el = ref.current; if (!el) return; el.scrollBy({ left: n * el.clientWidth, behavior: "smooth" }); };
  return (
    <div onKeyDown={e=>{if(e.key!=="Tab")return;const nodes=Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex=\"0\"]"));const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}} className="hunt-lightbox" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
      <button ref={closeRef} className="hunt-lb-close" aria-label="Close photos" onClick={onClose}><X size={22} /></button>
      <div className={"hunt-lb-track" + (zoom !== null ? " is-zoomed" : "")} ref={ref} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {images.map((src, n) => <div key={n} className={"hunt-lb-slide" + (zoom === n ? " is-zoom" : "")}><PropertyImage src={src} fallback={images.find(x=>x!==src)} sizes="100vw" alt={`${title}, photo ${n + 1}`} loading={Math.abs(n - start) < 2 ? "eager" : "lazy"}
          style={zoom === n ? { transformOrigin: origin } : undefined}
          onClick={(e) => { if (zoom === n) { setZoom(null); return; } const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); setZoom(n); }} /></div>)}
      </div>
      {images.length > 1 && <>
        <button className="hunt-lb-prev" aria-label="Previous photo" onClick={() => go(-1)}><ChevronLeft size={26} /></button>
        <button className="hunt-lb-next" aria-label="Next photo" onClick={() => go(1)}><ChevronRight size={26} /></button>
        <span className="hunt-lb-count">{i + 1} / {images.length}</span>
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- small cards, similar homes
export function MiniCard({ d }: { d: Row }) {
  return (
    <Link className="hunt-minicard" to={`/deal/${d.slug}`}>
      <PropertyImage src={d.image_urls?.[0]} fallback={d.image_urls?.[1]} alt={niceTitle(d)} loading="lazy" />
      <div><strong>{money(d.price_eur)}</strong><span>{niceTitle(d)}</span><small><MapPin size={11} /> {d.location_name || d.country}</small></div>
    </Link>
  );
}
export function SimilarHomes({ slug }: { slug: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { setRows(null); rpc("community_similar", { p_slug: slug, p_limit: 6 }).then(setRows).catch(() => setRows([])); }, [slug]);
  if (!rows?.length) return null;
  return (
    <section className="hunt-similar">
      <h2>{t("Similar homes")}</h2>
      <div className="hunt-minigrid">{rows.map((d) => <MiniCard key={d.id} d={d} />)}</div>
    </section>
  );
}

// ---------------------------------------------------------------- ask the seller
export function InfoRequest({ deal, dev }: { deal: Row; dev?: { name: string; slug: string; verified?: boolean } | null }) {
  const { user } = useAuth();
  const { requireUser, setNotice } = useCommunity();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", intent: "visit", message: "" });
  const [consent, setConsent] = useState(false);
  const [q, setQ] = useState({ budget: "", timeframe: "", financing: "", video: false, slots: "" });
  if (done) return <p className="hunt-info-done"><Check size={16} /> {dev ? <>Sent to {dev.name}. They have your details and usually answer within one or two working days. Follow the conversation in your <Link to="/inbox">inbox</Link>.</> : "Request sent. We check it is still available and put you in touch with the seller, usually within two working days."}</p>;
  return (
    <div className="hunt-info">
      {!open ? (
        <button className={dev ? "hunt-primary hv-ask-dev" : "hunt-secondary"} onClick={() => { try { (window as any).clarity?.("event", dev ? "buyer_ask_dev_open" : "buyer_ask_open"); } catch { /* ignore */ } if (!user) { requireUser(); return; } setOpen(true); }}><Mail size={16} /> {dev ? `Ask ${dev.name}` : t("Ask about this home")}</button>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          if (dev && !consent) { setBusy(false); setNotice("Tick the box so we can send your details to the developer."); return; }
          try { const r = await rpc("community_request_info", { p_deal: deal.id, p_name: f.name, p_phone: f.phone, p_intent: f.intent, p_message: f.message, p_consent: dev ? consent : null, p_budget: q.budget ? Number(q.budget) : null, p_timeframe: q.timeframe || null, p_financing: q.financing || null, p_video: q.video || null, p_slots: q.video ? q.slots : null }); if (r?.error) { setNotice(r.error); return; } try { (window as any).clarity?.("event", dev ? "buyer_ask_dev_sent" : "buyer_ask_sent"); } catch { /* ignore */ } setDone(true); }
          catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
        }}>
          <strong>{dev ? `Ask ${dev.name}` : t("Ask about this home")}</strong>
          <p className="hunt-fine">{dev ? `Your name, email and phone go to ${dev.name}, the developer, so they can answer you. Nobody else gets them.` : "We check it is still for sale and put you in touch with the seller. Your email stays private until you agree."}</p>
          <input required placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Phone or WhatsApp (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <select value={f.intent} onChange={(e) => setF({ ...f, intent: e.target.value })}>
            <option value="visit">I want to visit it</option>
            <option value="buy">I want to make an offer</option>
            <option value="questions">I have questions</option>
          </select>
          <div className="hv-qual">
            <select aria-label="Budget" value={q.budget} onChange={(e) => setQ({ ...q, budget: e.target.value })}><option value="">Budget (optional)</option>{[40000, 60000, 80000, 100000, 150000].map((b) => <option key={b} value={b}>Up to €{b.toLocaleString("en-GB")}</option>)}</select>
            <select aria-label="When" value={q.timeframe} onChange={(e) => setQ({ ...q, timeframe: e.target.value })}><option value="">When do you want to buy?</option><option value="now">In the next 3 months</option><option value="6m">Within 6 months</option><option value="12m">Within a year</option><option value="browsing">Just looking for now</option></select>
            <select aria-label="How will you pay" value={q.financing} onChange={(e) => setQ({ ...q, financing: e.target.value })}><option value="">How will you pay?</option><option value="cash">Cash</option><option value="mortgage_ok">Mortgage, pre-approved</option><option value="mortgage">I need a mortgage</option><option value="plan">Developer payment plan</option></select>
          </div>
          {dev && <label className="hv-consent"><input type="checkbox" checked={q.video} onChange={(e) => setQ({ ...q, video: e.target.checked })} /> <span>I would like a video-call tour</span></label>}
          {dev && q.video && <input placeholder="Best days and times for you, e.g. weekday evenings CET" value={q.slots} onChange={(e) => setQ({ ...q, slots: e.target.value })} />}
          <textarea placeholder="Anything the seller should know? (optional)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          {dev && <label className="hv-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>I agree that RealHunt sends my name, email and phone to {dev.name} so they can answer me.</span></label>}
          <div className="hunt-row"><button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send request"}</button><button type="button" className="hunt-link" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- filters
const PRICE_CAPS = [20000, 30000, 40000, 60000, 80000, 100000];
export function Filters({ countries, value: applied, onChange }: { countries: Record<string, number>; value: FeedParams; onChange: (v: FeedParams) => void }) {
  // 1-oct-2026: every filter applies at once. The old draft + "View N homes" step made a tap on a
  // country look broken (the grid kept showing every country until the second button was pressed).
  const value = applied;
  const setDraft = (v: FeedParams) => onChange(v);
  const list = Object.entries(countries || {}).sort((a, b) => b[1] - a[1]);
  const active = !!(value.country || value.category || value.max_price || value.min_sqm || (value.sort && value.sort !== "score"));
  const extra = [value.category, value.max_price, value.min_sqm, value.sort && value.sort !== "score" ? value.sort : ""].filter(Boolean).length;
  const [open, setOpen] = useState(() => extra > 0);
  // 14-oct-2026 (Carlos): only show a quick filter when at least one home matches it, given the other filters.
  const [qc, setQc] = useState<Record<string, number> | null>(null);
  // 15-oct-2026 fix (Carlos: "clicking a filter shows nothing"): the counts now include the quick filters that are
  // already on, so a chip only shows when ADDING it still leaves 3+ homes. Before, Garden + Views showed Sauna,
  // which led to 0 homes and an empty list.
  const vv: any = value;
  const qp = { country: value.country || "", category: value.category || "", max_price: value.max_price || null, min_sqm: value.min_sqm || null,
    q: vv.q || "", terms: vv.terms || [], min_score: value.min_score || null, need: value.need || [], dim_min: value.dim_min || {} };
  const qkey = JSON.stringify(qp);
  useEffect(() => {
    let live = true;
    rpc("community_quick_counts", { p: qp })
      .then((r: any) => { if (live && r && typeof r === "object") setQc(r); }).catch(() => {});
    return () => { live = false; };
  }, [qkey]);
  return (
    <div className={"hunt-filters" + (open ? " is-open" : "")}>
      <div className="hunt-chips" role="group" aria-label="Country">
        <button aria-pressed={!value.country} onClick={() => setDraft({ ...value, country: "" })}>{t("All countries")}</button>
        {list.map(([c, n]) => { const sel = (value.country || "").split(",").filter(Boolean); const on = sel.includes(c); return <button key={c} aria-pressed={on} onClick={() => setDraft({ ...value, country: (on ? sel.filter((x) => x !== c) : [...sel, c]).join(",") })}>{c === "Scandinavia" ? t("Scandinavia · region") : c} <small>{n}</small></button>; })}
      </div>
      <div className="hunt-chips rh-quick" role="group" aria-label={t("Quick filters")}>
        {QUICK.map((qf) => {
          const on = qf.min ? (value.min_score || 0) >= qf.min : qf.need ? (value.need || []).includes(qf.need) : qf.dim ? (value.dim_min || {})[qf.dim[0]] === qf.dim[1] : false;
          const flip = () => {
            if (qf.min) return setDraft({ ...value, min_score: on ? null : qf.min });
            if (qf.need) { const n = value.need || []; return setDraft({ ...value, need: on ? n.filter((x) => x !== qf.need) : [...n, qf.need as string] }); }
            if (qf.dim) { const d = { ...(value.dim_min || {}) }; if (on) delete d[qf.dim[0]]; else d[qf.dim[0]] = qf.dim[1];
              // 14-oct-2026 (Carlos): "Near an airport" also lists the closest airport first.
              const sort = qf.k === "air" ? (on ? (value.sort === "airport" ? "score" : value.sort) : "airport") : value.sort;
              return setDraft({ ...value, dim_min: d, sort }); }
          };
          if (!on && qc && (qc[qf.k] ?? 3) < 3) return null; // 14-oct-2026 (Carlos): a quick filter only shows when at least 3 homes match it
          return <button key={qf.k} aria-pressed={on} onClick={flip}>{on ? <Check size={13} /> : null}<span>{t(qf.label)}</span></button>;
        })}
      </div>
      <div className="rh-active-filters">{([ ["category",applied.category], ["max_price",applied.max_price?money(applied.max_price):null], ["min_sqm",applied.min_sqm?`${applied.min_sqm} m²+`:null] ] as const).filter(([,v])=>v).map(([k,v])=><button key={k} aria-label={`${t("Remove")} ${v}`} onClick={()=>onChange({...applied,[k]:null})}>{v} ×</button>)}</div>
      <button type="button" className="hunt-link hunt-filter-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? t("Hide filters") : t("More filters")}{extra > 0 ? ` (${extra})` : ""}</button>
      {open && <div className="hunt-filter-row">
        <label><span>{t("Max price")}</span>
          <select value={value.max_price || ""} onChange={(e) => setDraft({ ...value, max_price: e.target.value ? Number(e.target.value) : null })}>
            <option value="">{t("Any price")}</option>
            {Array.from(new Set([...PRICE_CAPS.slice(0, -1),...(value.max_price?[value.max_price]:[])])).sort((a,b)=>a-b).map((p) => <option key={p} value={p}>{money(p)}</option>)}
          </select></label>
        <label><span>{t("Any type")}</span>
          <select value={value.category || ""} onChange={(e) => setDraft({ ...value, category: e.target.value })}>
            <option value="">{t("Any type")}</option>
            {categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label><span>{t("Min size")}</span>
          <select value={value.min_sqm || ""} onChange={(e) => setDraft({ ...value, min_sqm: e.target.value ? Number(e.target.value) : null })}>
            <option value="">—</option>
            {[40, 60, 80, 100, 150].map((s) => <option key={s} value={s}>{s} m²+</option>)}
          </select></label>
        <label><span>{t("Sort")}</span>
          <select value={value.sort || "score"} onChange={(e) => setDraft({ ...value, sort: e.target.value })}>
            <option value="score">{t("Best score")}</option><option value="new">{t("Newest")}</option>
            <option value="price_asc">{t("Cheapest")}</option><option value="airport">{t("Nearest airport")}</option><option value="sqm">{t("Biggest")}</option>{DIMS.filter(([k]) => k !== "interest").map(([k, l]) => <option key={k} value={"dim:" + k}>{`${t("Best")}: ${t(l)}`}</option>)}
          </select></label>
      </div>}
    </div>
  );
}

// ---------------------------------------------------------------- daily drop
function useCountdown(to?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);
  if (!to) return "";
  const ms = new Date(to).getTime() - now; if (ms <= 0) return "now";
  const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
export function DropBar({ next, early }: { next?: string; early: number }) {
  // 23-sep-2026 (Carlos): no daily 18:00 drop. Homes go live as soon as they are approved.
  if (true as boolean) return null;
  const { user } = useAuth();
  const { requireUser } = useCommunity();
  const left = useCountdown(next);
  if (!next) return null;
  return (
    <div className="hunt-drop">
      <Clock size={16} />
      <span><strong>{t("Next drop in")} {left}</strong> · {t("New homes go live every day at 18:00 (Madrid).")} {user ? (early > 0 ? `${t("You have early access")}: ${early} ${early === 1 ? "home" : "homes"} before everyone else.` : t("Signed-in members see them a day early.")) : t("Signed-in members see them a day early.")}</span>
      {!user && <button className="hunt-link" onClick={() => requireUser()}>{t("Get early access")}</button>}
    </div>
  );
}

// ---------------------------------------------------------------- alerts + first-visit personalisation
export function AlertForm({ countries, initial, compact = false, onApply }: { countries: string[]; initial?: FeedParams; compact?: boolean; onApply?: (v: FeedParams) => void }) {
  const { user } = useAuth();
  const [picked, setPicked] = useState<string[]>(initial?.country ? [initial.country] : []);
  const [max, setMax] = useState<number>(initial?.max_price || 100000);
  const [cat, setCat] = useState(initial?.category || "");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"" | "busy" | "ok" | string>("");
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user?.email]);
  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const prefs = () => { try { localStorage.setItem("rh_prefs", JSON.stringify({ countries: picked, max, cat })); localStorage.setItem("rh_onb", "1"); } catch { /* ignore */ } };
  return (
    <form className={"hunt-alertform" + (compact ? " is-compact" : "")} onSubmit={async (e) => {
      e.preventDefault(); setState("busy"); prefs();
      try { await rpc("community_save_alert", { p_email: email, p_countries: picked.length ? picked : countries, p_max_price: max, p_category: cat, p_source: "hunt" }); setState("ok"); }
      catch (err) { setState((err as Error).message); }
    }}>
      <div className="hunt-chips" role="group" aria-label="Countries">
        {countries.map((c) => <button type="button" key={c} aria-pressed={picked.includes(c)} onClick={() => toggle(c)}>{c}</button>)}
      </div>
      <div className="hunt-filter-row">
        <label><span>{t("Max price")}</span><select value={max} onChange={(e) => setMax(Number(e.target.value))}>{PRICE_CAPS.map((p) => <option key={p} value={p}>{money(p)}</option>)}</select></label>
        <label><span>{t("Any type")}</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">{t("Any type")}</option>{categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      {onApply && <button type="button" className="hunt-secondary" onClick={() => { prefs(); onApply({ country: picked.length === 1 ? picked[0] : "", max_price: max < 100000 ? max : null, category: cat }); }}>{t("Show my homes")}</button>}
      {state === "ok" ? <p className="hunt-info-done"><Check size={16} /> Saved. Sign in with this email to manage daily or weekly alerts. Emails go only to confirmed accounts.</p> : (
        <div className="hunt-row">
          <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="hunt-primary" disabled={state === "busy"}>{t("Email me new matches")}</button>
        </div>
      )}
      {state && state !== "ok" && state !== "busy" && <p role="alert" className="hunt-error-text">{state}</p>}
    </form>
  );
}
export function Personalise({ countries, onApply }: { countries: string[]; onApply: (v: FeedParams) => void }) {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem("rh_onb") === "1"; } catch { return true; } });
  if (hidden || !countries.length) return null;
  return (
    <section className="hunt-personalise">
      <button className="hunt-x" aria-label="Hide" onClick={() => { try { localStorage.setItem("rh_onb", "1"); } catch { /* ignore */ } setHidden(true); }}><X size={16} /></button>
      <strong>Where would you buy?</strong>
      <p>Pick countries and a budget. We show those homes first, and can email you when new ones match.</p>
      <AlertForm countries={countries} compact onApply={(v) => { setHidden(true); onApply(v); }} />
    </section>
  );
}
export function AlertsPage() {
  const [countries, setCountries] = useState<string[]>([]);
  useEffect(() => { document.title = "Alerts for the best new homes · RealHunt"; feed({ limit: 1 }).then((f) => setCountries(Object.keys(f.countries_count || {}))).catch(() => {}); }, []);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{t("Alerts")}</span>
      <h1>Get new homes that match you</h1>
      <p>Choose countries, budget and type. Confirmed accounts can choose daily or weekly updates, or switch them off. New matches you have already opened are excluded.</p>
      <AlertForm countries={countries} /><BuyerAlertPreferences/>
    </div>
  );
}

// ---------------------------------------------------------------- explore strip
export function ExploreLinks() {
  return (
    <nav className="hunt-explore" aria-label={t("Explore")}>
      <Link to="/top"><Trophy size={15} /> Top 100</Link>
      <Link to="/swipe"><Heart size={15} /> {t("Swipe")}</Link>
      <Link to="/map"><MapPin size={15} /> {t("Map")}</Link>
      <Link to="/leaderboard"><Trophy size={15} /> {t("Hunters")}</Link>
      <Link to="/guide/italy">{t("Guides")}</Link>
      <Link to="/help-buying">{t("Help buying")}</Link>
      <Link to="/alerts"><Mail size={15} /> {t("Alerts")}</Link>
    </nav>
  );
}

// ---------------------------------------------------------------- swipe
export function SwipePage() {
  const { session, setSession, call, setNotice } = useCommunity();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const navigate = useNavigate();
  useEffect(() => { document.title = "Swipe the best homes · RealHunt"; feedAll({}).then((f) => setRows(f.rows)).catch(() => setRows([])); }, []);
  // The deck is fixed when it loads: homes already voted are left out once, then every like or skip
  // moves to the next card. (Before 2-oct-2026 a like re-filtered the deck and the same card stayed.)
  const votedAtLoad = useRef<Record<string, number> | null>(null);
  if (rows && votedAtLoad.current === null) votedAtLoad.current = { ...(session?.votes || {}) };
  const list = useMemo(() => (rows || []).filter((r) => !votedAtLoad.current?.[r.id]), [rows]);
  const d = list[i];
  const busy = useRef(false);
  function decide(like: boolean) {
    if (!d || busy.current) return;
    busy.current = true;
    bumpIx();
    setDx(like ? 600 : -600);
    const id = d.id;
    const had = session?.votes?.[id] === 1;
    if (!like && had) {
      // Back + Skip on a home you liked by mistake takes the vote back (4-oct-2026).
      call("vote", { id, value: 0 }).then(() => {
        setSession((s: any) => { if (!s) return s; const votes = { ...(s.votes || {}) }; delete votes[id]; return { ...s, votes }; });
        setNotice(t("Vote removed."));
      }).catch((e) => setNotice((e as Error).message));
    }
    if (like && !had) {
      call("vote", { id, value: 1 }).then(() => {
        setSession((s: any) => (s ? { ...s, votes: { ...(s.votes || {}), [id]: 1 } } : s));
        const days = bumpStreak();
        setNotice(days > 1 ? `Your vote counts. ${days} days in a row.` : t("Your vote counts."));
      }).catch((e) => setNotice((e as Error).message));
    }
    setTimeout(() => { setDx(0); setI((n) => n + 1); busy.current = false; }, 200);
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") decide(true); if (e.key === "ArrowLeft") decide(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  if (!rows) return <div className="hunt-wrap"><div className="hunt-skeleton-swipe" /></div>;
  const next = list[i + 1];
  return (
    <div className="hunt-wrap hunt-swipe hv-swipe">
      {d && <div className="hv-swipe-bg" style={{ backgroundImage: `url("${d.image_urls?.[0]}")` }} aria-hidden="true" />}
      <div className="hv-swipe-top"><h1 className="hv-swipe-h1">{t("Swipe")}</h1><span>{list.length - i > 0 ? `${list.length - i} homes left` : ""}</span>{i > 0 && <button className="hunt-link hv-swipe-undo" onClick={() => setI((n) => Math.max(0, n - 1))}>Back</button>}</div>
      {!d ? (
        <div className="hunt-empty"><h3>You have seen every home this week.</h3><p>New homes are added every week.</p><Link className="hunt-primary" to="/map">{t("Map")}</Link></div>
      ) : (
        <>
          {next && <div className="hunt-swipe-card is-next" aria-hidden="true"><img src={next.image_urls?.[0]} alt="" draggable={false} /></div>}
          <div className="hunt-swipe-card" key={d.id} style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: start.current === null ? "transform .18s ease" : "none" }}
            onPointerDown={(e) => { start.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
            onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
            onPointerUp={() => { const v = dx; start.current = null; if (v > 110) decide(true); else if (v < -110) decide(false); else if (Math.abs(v) < 6) navigate(`/deal/${d.slug}`); else setDx(0); }}>
            <img src={d.image_urls?.[0]} alt={niceTitle(d)} draggable={false} />
            {dx > 40 && <span className="hunt-swipe-stamp is-like">VOTE</span>}
            {dx < -40 && <span className="hunt-swipe-stamp is-skip">SKIP</span>}
            <div className="hunt-swipe-info">
              <strong>{money(d.price_eur)}</strong>
              <span>{niceTitle(d)}</span>
              <small><MapPin size={12} /> {d.location_name}{d.sqm ? ` · ${d.sqm} m²` : ""}</small>
            </div>
          </div>
          <div className="hunt-swipe-actions">
            <button aria-label="Skip" onClick={() => decide(false)}><X size={30} /></button>
            <Link to={`/deal/${d.slug}`} className="hv-swipe-info-btn" aria-label="Details">i</Link>
            <button aria-label="Vote" className="is-like" onClick={() => decide(true)}><Heart size={30} fill="currentColor" /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- leaderboard, invites, collections
export function LeaderboardPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { document.title = "Top hunters · RealHunt"; rpc("community_leaderboard", { p_limit: 50 }).then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{t("Hunters")}</span>
      <h1>Top hunters</h1>
      <p>Points: 10 for every approved find, 1 for every vote your finds get, 15 for an editor's pick, 5 for every friend you bring. The hunter of the month is featured on the home page.</p>
      {!rows ? <div className="hunt-skeleton-list" /> : rows.length === 0 ? (
        <div className="hunt-empty"><Trophy size={30} /><h3>The board is empty. The first hunter takes #1.</h3><p>Submit a great home that people should see.</p><Link className="hunt-primary" to="/submit">{t("Submit a Deal")}</Link></div>
      ) : (
        <ol className="hunt-leaders">
          {rows.map((r, n) => (
            <li key={r.handle}>
              <span className="hunt-leader-rank">{n + 1}</span>
              <Link to={`/hunter/${r.handle}`}><strong>{r.display_name || r.handle}</strong> <small>@{r.handle}</small></Link>
              <span className="hunt-leader-badges">{(r.badges || []).map((b: string) => <em key={b}>{b}</em>)}</span>
              <span className="hunt-leader-points">{nf(r.points)} pts<small>{r.finds} finds · {r.votes_received} votes</small></span>
            </li>
          ))}
        </ol>
      )}
      <p className="hunt-row"><Link className="hunt-secondary" to="/invite"><Users size={16} /> {t("Invite")}</Link></p>
    </div>
  );
}
export function InvitePage() {
  const { user } = useAuth();
  const { requireUser, setNotice } = useCommunity();
  const [me, setMe] = useState<{ code: string; count: number } | null>(null);
  useEffect(() => { document.title = "Invite friends · RealHunt"; if (user) rpc("community_my_referral").then((r) => { setMe(r); try { localStorage.setItem("rh_my_ref", r.code); } catch { /* ignore */ } }).catch(() => {}); }, [user?.id]);
  const link = me ? `https://realhunt.co/?ref=${me.code}` : "";
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{t("Invite")}</span>
      <h1>Bring friends who dream of a cheap house</h1>
      <p>Every friend who joins with your link gives you 5 hunter points. Bring three and you become an Insider: every new home 48 hours before everyone else, plus the secret weekly Top 5. You also get the Connector badge. Your friends get the full listing links as soon as they sign in.</p>
      {!user ? <button className="hunt-primary" onClick={() => requireUser()}>{t("Sign in")}</button> : !me ? <div className="hunt-skeleton-list" /> : (
        <div className="hunt-invite">
          <code>{link}</code>
          <div className="hunt-row">
            <button className="hunt-primary" onClick={() => (navigator.share ? navigator.share({ title: "RealHunt", text: "The best homes in every country, ranked by score. Join me:", url: link }) : navigator.clipboard.writeText(link).then(() => setNotice("Link copied ✓"))).catch(() => {})}><Share2 size={16} /> {t("Share")}</button>
            <button className="hunt-secondary" onClick={() => navigator.clipboard.writeText(link).then(() => setNotice("Link copied ✓"))}><Copy size={16} /> Copy</button>
          </div>
          <p><strong>{me.count}</strong> {me.count === 1 ? "friend has" : "friends have"} joined with your link.</p>
        </div>
      )}
    </div>
  );
}
export function useReferralCapture() {
  const { user } = useAuth();
  useEffect(() => {
    try {
      const r = new URLSearchParams(location.search).get("ref");
      if (r && /^[0-9a-f]{8}$/.test(r) && !localStorage.getItem("rh_ref")) localStorage.setItem("rh_ref", r);
      guestRef();
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!user) return;
    let r: string | null = null;
    try { r = localStorage.getItem("rh_ref"); } catch { /* ignore */ }
    if (r) rpc("community_claim_referral", { p_code: r }).finally(() => { try { localStorage.removeItem("rh_ref"); } catch { /* ignore */ } });
    rpc("community_my_referral").then((m) => { try { localStorage.setItem("rh_my_ref", m.code); } catch { /* ignore */ } }).catch(() => {});
  }, [user?.id]);
}
export function ShareSavedToggle() {
  const { session, setNotice } = useCommunity();
  const [pub, setPub] = useState<boolean | null>(null);
  const handle = session?.hunter?.handle;
  if (!handle) return <p className="hunt-fine">Pick a hunter name in your profile to share your saved homes as a public collection.</p>;
  const link = `https://realhunt.co/c/${handle}`;
  return (
    <div className="hunt-sharesaved">
      <label><input type="checkbox" checked={!!pub} onChange={async (e) => {
        try { const r = await rpc("community_set_public_saves", { p_public: e.target.checked }); setPub(r.public); setNotice(r.public ? "Your collection is public ✓" : "Your collection is private"); } catch (err) { setNotice((err as Error).message); }
      }} /> Make my saved homes a public collection</label>
      {pub && <button className="hunt-link" onClick={() => (navigator.share ? navigator.share({ title: `${handle}'s homes on RealHunt`, url: link }) : navigator.clipboard.writeText(link).then(() => setNotice("Link copied ✓"))).catch(() => {})}><Share2 size={14} /> {link.replace("https://", "")}</button>}
    </div>
  );
}
export function CollectionPage() {
  const { handle = "" } = useParams();
  const [data, setData] = useState<any>(null);
  useEffect(() => { document.title = `${handle}'s homes · RealHunt`; rpc("community_public_collection", { p_handle: handle }).then(setData).catch((e) => setData({ error: e.message })); }, [handle]);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">Collection</span>
      <h1>{data?.display_name || handle}'s homes</h1>
      {!data ? <div className="hunt-skeleton-list" /> : data.error ? <p>{data.error}</p> : (
        <div className="hunt-minigrid">{(data.rows || []).map((d: Row) => <MiniCard key={d.id} d={d} />)}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- guides and country pages
const GUIDES: Record<string, { name: string; steps: [string, string][]; yearly: string }> = {
  italy: {
    name: "Italy",
    steps: [
      ["Get a codice fiscale", "Your Italian tax code. It is free, from the Agenzia delle Entrate in Italy or an Italian consulate abroad."],
      ["Make a written offer", "The proposta d'acquisto usually comes with a small deposit. Once accepted, many buyers sign a preliminary contract (compromesso) with a 10–30% deposit."],
      ["Check the house", "Ask for the land registry extract (visura catastale), proof the building matches its plans (conformità urbanistica e catastale), the energy certificate (APE) and any unpaid debts on the property."],
      ["Sign at the notary", "The deed (rogito) is signed before a notaio, who checks the title and registers the sale. You can sign by power of attorney if you cannot travel."],
      ["Pay the taxes", "Buying from a private seller: registration tax 9% of the cadastral value for a second home, or 2% if it becomes your main home, plus €50 + €50 fixed taxes and the notary's fee."],
    ],
    yearly: "IMU (council property tax) on second homes and a local waste tax (TARI). For small rural houses these are often a few hundred euros a year.",
  },
  spain: {
    name: "Spain",
    steps: [
      ["Get an NIE", "Your foreigner identity number, from a Spanish consulate or a police station in Spain. You need it to sign and to pay taxes."],
      ["Open a Spanish bank account", "Most notaries and councils expect payments and bills to go through a Spanish account."],
      ["Reserve with an arras contract", "A private contract with a deposit, usually 10%. If the seller backs out, they normally return it twice."],
      ["Check the house", "Order a nota simple from the Land Registry (owner and debts). In the countryside, check the land status (suelo rústico) and that the buildings are legal. Ask for the last IBI receipts."],
      ["Sign at the notary and register", "The escritura is signed before a notario and then registered at the Registro de la Propiedad."],
      ["Pay the transfer tax", "Resale homes pay ITP of 6–10% depending on the region, plus notary and registry of roughly €1,000–2,000."],
    ],
    yearly: "IBI (council tax) and waste collection. Non-residents who do not rent the house out also file a small yearly imputed-income tax.",
  },
  portugal: {
    name: "Portugal",
    steps: [
      ["Get a NIF", "Your tax number, at a Finanças office or through a representative. Non-EU residents usually need a fiscal representative."],
      ["Sign a promissory contract", "The CPCV fixes price and date, with a deposit of 10–30%."],
      ["Check the house", "Ask for the caderneta predial and the certidão permanente (owner, debts, urban or rustic), and the habitation licence (licença de utilização)."],
      ["Sign the deed", "At a notary or a Casa Pronta office, then the sale is registered at the Conservatória."],
      ["Pay the taxes", "IMT on a sliding scale up to about 8% (5% on rustic land) and stamp duty of 0.8%."],
    ],
    yearly: "IMI (council tax), usually 0.3–0.45% of the tax value for urban property.",
  },
};
export function GuidePage() {
  const { country = "italy" } = useParams();
  const g = GUIDES[country.toLowerCase()];
  const [homes, setHomes] = useState<Row[]>([]);
  useEffect(() => {
    if (!g) return;
    document.title = `How to buy a cheap home in ${g.name} as a foreigner · RealHunt`;
    feed({ country: g.name, limit: 6 }).then((f) => setHomes(f.rows)).catch(() => {});
  }, [country]);
  if (!g) return <div className="hunt-wrap hunt-page"><h1>Guides</h1><p>{Object.values(GUIDES).map((x) => <Link key={x.name} to={`/guide/${x.name.toLowerCase()}`} className="hunt-link">{x.name} </Link>)}</p></div>;
  return (
    <div className="hunt-wrap hunt-page hunt-guide">
      <span className="hunt-eyebrow">{t("Guides")}</span>
      <h1>How to buy a cheap home in {g.name} as a foreigner</h1>
      <p>The steps, papers and taxes, in plain words. General information, not legal advice: use a local lawyer before you sign.</p>
      <nav className="hunt-chips">{Object.entries(GUIDES).map(([k, x]) => <Link key={k} to={`/guide/${k}`} aria-current={k === country ? "page" : undefined}>{x.name}</Link>)}</nav>
      <ol className="hunt-steps">{g.steps.map(([h, b]) => <li key={h}><strong>{h}</strong><p>{b}</p></li>)}</ol>
      <h2>Every year</h2><p>{g.yearly}</p>
      <div className="hunt-row"><Link className="hunt-primary" to={`/homes/${country}`}>Best homes in {g.name}</Link><Link className="hunt-secondary" to="/help-buying">{t("Help buying")}</Link></div>
      {homes.length > 0 && <><h2>Voted homes in {g.name}</h2><div className="hunt-minigrid">{homes.map((d) => <MiniCard key={d.id} d={d} />)}</div></>}
    </div>
  );
}
export function HomesPage() {
  const { country = "", cap = "" } = useParams();
  const name = decodeURIComponent(country).replace(/-/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const max = Number((cap.match(/\d+/) || [])[0]) || 0; // 0 = no price cap (RealHunt has no €100k limit any more)
  const [data, setData] = useState<{ rows: Row[]; total: number } | null>(null);
  useEffect(() => {
    document.title = max ? `Homes under ${money(max)} in ${name} · RealHunt` : `Best homes for sale in ${name} · RealHunt`;
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", max ? `Houses for sale under ${money(max)} in ${name}, each one scored and ranked. Updated every day.` : `The best houses for sale in ${name}, each one scored and ranked best first. Updated every day.`);
    setData(null); feed({ scope: "all", country: name, ...(max ? { max_price: max } : {}), limit: 60 }).then(setData).catch(() => setData({ rows: [], total: 0 }));
  }, [country, cap]);
  const top = data?.rows?.[0];
  const avg = data?.rows?.length ? Math.round(data.rows.reduce((a, r) => a + (r.price_eur || 0), 0) / data.rows.length / 500) * 500 : 0;
  const low = data?.rows?.length ? Math.min(...data.rows.map((r) => r.price_eur || 1e9)) : 0;
  return (
    <div className="hunt-wrap hunt-page hv-country">
      <header className="hv-country-hero" style={top ? { backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.72)),url("${top.image_urls?.[0]}")` } : undefined}>
        <span className="hunt-eyebrow">{name}</span>
        <h1>{max ? <>Homes under {money(max)} in {name}</> : <>Best homes for sale in {name}</>}</h1>
        {data && data.total > 0 && <div className="hv-country-stats"><span><b>{data.total}</b> homes</span><span>from <b>{money(low)}</b></span><span>average <b>{money(avg)}</b></span></div>}
      </header>
      {data && data.rows.length >= 3 && <><h2 className="hv-country-h2">Top 3 in {name}</h2><div className="hv-country-top">{data.rows.slice(0, 3).map((d, n) => <Link key={d.id} to={`/deal/${d.slug}`}><img src={d.image_urls?.[0]} alt="" /><span className="hv-pod-medal">{["🥇", "🥈", "🥉"][n]}</span><strong>{money(d.price_eur)}</strong><small>{d.location_name}</small></Link>)}</div><h2 className="hv-country-h2">All homes</h2></>}
      <p>{data ? `${data.total} homes, ranked by people's votes.` : "Loading…"} Every home links to its original listing.</p>
      <nav className="hunt-chips">{PRICE_CAPS.map((p) => <Link key={p} aria-current={p === max ? "page" : undefined} to={p === 100000 ? `/homes/${country}` : `/homes/${country}/under-${p}`}>{money(p)}</Link>)}</nav>
      {!data ? <div className="hunt-skeleton-list" /> : <div className="hunt-minigrid">{data.rows.map((d) => <MiniCard key={d.id} d={d} />)}</div>}
      {GUIDES[country.toLowerCase()] && <p className="hunt-row"><Link className="hunt-secondary" to={`/guide/${country.toLowerCase()}`}>How to buy in {name}</Link></p>}
    </div>
  );
}

// ---------------------------------------------------------------- help buying from abroad
const SERVICES = [
  ["lawyer", "A local lawyer to check the title and the contract"],
  ["tax-number", "Getting your tax number (NIE, NIF, codice fiscale)"],
  ["translator", "A translator for calls and the notary"],
  ["visit", "Someone to visit the house for you, with photos and video"],
  ["survey", "A building survey before you buy"],
  ["renovation", "Renovation quotes from local builders"],
  ["bank", "Opening a local bank account"],
];
export function ServicesPage() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const [f, setF] = useState({ email: "", country: sp.get("country") || "", services: [] as string[], message: "" });
  const [state, setState] = useState("");
  useEffect(() => { document.title = "Help buying a home abroad · RealHunt"; if (user?.email) setF((x) => ({ ...x, email: user.email! })); }, [user?.email]);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{t("Help buying")}</span>
      <h1>Buying from another country? Get local help.</h1>
      <p>Tell us what you need. We reply by email with trusted local people and their prices, before you commit to anything.</p>
      {state === "ok" ? <p className="hunt-info-done"><Check size={16} /> Thanks. We will reply by email within two working days.</p> : (
        <form className="hunt-form" onSubmit={async (e) => {
          e.preventDefault(); setState("busy");
          try { await rpc("community_request_service", { p_email: f.email, p_country: f.country, p_services: f.services, p_message: f.message, p_deal: null }); setState("ok"); }
          catch (err) { setState((err as Error).message); }
        }}>
          <fieldset><legend>What do you need?</legend>
            {SERVICES.map(([k, l]) => <label key={k} className="hunt-check"><input type="checkbox" checked={f.services.includes(k)} onChange={(e) => setF({ ...f, services: e.target.checked ? [...f.services, k] : f.services.filter((x) => x !== k) })} /> {l}</label>)}
          </fieldset>
          <label>Country<select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">Choose</option>{["Italy", "Spain", "Portugal", "France", "Greece", "Other"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <label>Anything else? (optional)<textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Which home, your timing, your budget…" /></label>
          <button className="hunt-primary" disabled={state === "busy" || !f.services.length}>Send</button>
          {state && state !== "busy" && <p role="alert" className="hunt-error-text">{state}</p>}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- admin inbox
export function AdminInbox() {
  const { session, setNotice } = useCommunity();
  const [data, setData] = useState<any>(null);
  const load = () => rpc("community_admin_inbox").then(setData).catch((e) => setData({ error: e.message }));
  useEffect(() => { if (session?.admin) load(); }, [session?.admin]);
  if (!session?.admin) return <div className="hunt-wrap hunt-page"><p>Admins only.</p></div>;
  const mark = async (kind: string, id: string, status: string) => { try { await rpc("community_admin_mark", { p_kind: kind, p_id: id, p_status: status }); load(); } catch (e) { setNotice((e as Error).message); } };
  return (
    <div className="hunt-wrap hunt-page">
      <h1>Inbox</h1>
      {!data ? <div className="hunt-skeleton-list" /> : data.error ? <p>{data.error}</p> : <>
        <p>{data.alerts} active alerts saved (emails are off until you switch them on).</p>
        <h2>Ask the seller ({data.info.length})</h2>
        <table className="hunt-table"><tbody>{data.info.map((r: any) => <tr key={r.id} className={r.status !== "new" ? "is-done" : ""}>
          <td>{new Date(r.created_at).toLocaleString()}</td><td><Link to={`/deal/${r.slug}`}>{r.title}</Link>{r.source_url && <> · <a href={r.source_url} target="_blank" rel="noreferrer">listing</a></>}</td>
          <td>{r.name}<br /><a href={`mailto:${r.email}`}>{r.email}</a>{r.phone && <><br />{r.phone}</>}</td><td>{r.intent}<br /><small>{r.message}</small></td>
          <td><select value={r.status} onChange={(e) => mark("info", r.id, e.target.value)}><option value="new">new</option><option value="contacted">contacted</option><option value="done">done</option></select></td></tr>)}</tbody></table>
        <h2>Help buying ({data.services.length})</h2>
        <table className="hunt-table"><tbody>{data.services.map((r: any) => <tr key={r.id} className={r.status !== "new" ? "is-done" : ""}>
          <td>{new Date(r.created_at).toLocaleString()}</td><td><a href={`mailto:${r.email}`}>{r.email}</a></td><td>{r.country}</td><td>{(r.services || []).join(", ")}<br /><small>{r.message}</small></td>
          <td><select value={r.status} onChange={(e) => mark("service", r.id, e.target.value)}><option value="new">new</option><option value="contacted">contacted</option><option value="done">done</option></select></td></tr>)}</tbody></table>
      </>}
    </div>
  );
}
export function AdminVerify({ deal, onDone }: { deal: Row; onDone: () => void }) {
  const { session, setNotice } = useCommunity();
  if (!session?.admin) return null;
  return (
    <div className="hunt-row hunt-admin-verify">
      <button className="hunt-secondary" onClick={async () => {
        const note = window.prompt("What did you check? (e.g. 'Called the agency, still for sale at this price')", "Called the agency: still for sale at this price");
        if (note === null) return;
        try { await rpc("community_admin_verify", { p_deal: deal.id, p_note: note, p_clear: false }); setNotice("Marked as verified ✓"); onDone(); } catch (e) { setNotice((e as Error).message); }
      }}><BadgeCheck size={15} /> Mark verified today</button>
      {deal.verified_at && <button className="hunt-link" onClick={async () => { await rpc("community_admin_verify", { p_deal: deal.id, p_note: "", p_clear: true }); onDone(); }}>Remove verification</button>}
    </div>
  );
}

// ---------------------------------------------------------------- install + language
let deferredPrompt: any = null;
if (typeof window !== "undefined") window.addEventListener("beforeinstallprompt", (e: any) => { e.preventDefault(); deferredPrompt = e; window.dispatchEvent(new Event("rh-installable")); });
export function InstallButton() {
  const [can, setCan] = useState(!!deferredPrompt);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    const on = () => setCan(true); window.addEventListener("rh-installable", on);
    const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator as any).standalone;
    setIos(!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent));
    return () => window.removeEventListener("rh-installable", on);
  }, []);
  const [tip, setTip] = useState(false);
  if (!can && !ios) return null;
  return (
    <span className="hunt-install">
      <button className="hunt-link" onClick={async () => { if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; setCan(false); } else setTip((x) => !x); }}><Download size={14} /> {t("Install app")}</button>
      {tip && <small> On iPhone: tap Share, then "Add to Home Screen".</small>}
    </span>
  );
}
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const l = getLang();
  return (
    <span className={"rh-lang" + (compact ? " is-compact" : "")} role="group" aria-label="Language" translate="no">
      {LANGS.map((x) => <button key={x.code} type="button" className={l === x.code ? "is-on" : ""} aria-pressed={l === x.code} onClick={() => setLang(x.code)} title={x.label}>{x.code.toUpperCase()}</button>)}
    </span>
  );
}
export function useLangVersion() {
  const [v, setV] = useState(0);
  useEffect(() => { const on = () => setV((n) => n + 1); window.addEventListener("rh-lang", on); try { document.documentElement.lang = getLang(); } catch { /* ignore */ } return () => window.removeEventListener("rh-lang", on); }, []);
  return v;
}

// ---------------------------------------------------------------- live podium for the winners page
export function LivePodium() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { feed({ limit: 3 }).then((f) => setRows(f.rows)).catch(() => {}); }, []);
  if (rows.length < 3) return null;
  const order = [rows[1], rows[0], rows[2]];
  return (
    <section className="hunt-podium" aria-label="Top homes">
      <h2>Top homes right now</h2>
      <div>{order.map((d, n) => (
        <Link key={d.id} to={`/deal/${d.slug}`} className={"hunt-podium-" + (n === 1 ? 1 : n === 0 ? 2 : 3)}>
          <img src={d.image_urls?.[0]} alt="" loading="lazy" />
          <strong>#{d.rank} · {money(d.price_eur)}</strong>
          <span>{d.life_net} {d.life_net === 1 ? "vote" : "votes"}</span>
          <i />
        </Link>
      ))}</div>
    </section>
  );
}
