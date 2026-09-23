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
export type FeedParams = { scope?: string; country?: string; category?: string; max_price?: number | null; min_sqm?: number | null; sort?: string; limit?: number; offset?: number; ids?: string[]; q?: string };
export async function feed(p: FeedParams) {
  const { data, error } = await (supabase.rpc as any)("community_feed", { p });
  if (error) throw new Error("The homes could not load. Please try again.");
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
export function shareText(d: Row, scope = "week") {
  const price = d.price_eur != null ? money(d.price_eur) : "";
  const rank = d.rank ? ` · #${d.rank} ${scope === "all" ? "all time" : "this week"} on RealHunt` : " on RealHunt";
  return `${niceTitle(d)}${price && !niceTitle(d).includes(price) ? ` for ${price}` : ""}${rank}`;
}
export async function shareRow(d: Row, scope = "week") {
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
  Australia: { tax: 1400, insurance: 900, utilities: 2000, taxName: "council rates" },
};
export function CostPanel({ deal }: { deal: Row }) {
  const [rent, setRent] = useState(() => { try { return Number(localStorage.getItem("rh_rent")) || 900; } catch { return 900; } });
  useEffect(() => { try { localStorage.setItem("rh_rent", String(rent)); } catch { /* ignore */ } }, [rent]);
  if (deal.price_eur == null) return null;
  const allin = totalCost(deal.price_eur, deal.country) || deal.price_eur;
  const run = RUNNING[deal.country] || { tax: 300, insurance: 200, utilities: 1200, taxName: "property tax" };
  const yearly = run.tax + run.insurance + run.utilities;
  const reno = deal.category === "renovation" || /renovat|restor|ruin|to refurbish/i.test(deal.title || "");
  const months = rent > 0 ? Math.round(allin / rent) : 0;
  return (
    <section className="hunt-cost" aria-label={t("What it really costs")}>
      <h3>{t("What it really costs")}</h3>
      <dl>
        <div><dt>Asking price</dt><dd>{money(deal.price_eur)}</dd></div>
        <div><dt>Taxes, notary and registry</dt><dd>+{money(allin - deal.price_eur)}</dd></div>
        <div className="is-total"><dt>All-in to buy</dt><dd>{money(allin)}</dd></div>
        {reno && deal.sqm ? <div><dt>Renovation, typical range</dt><dd>{money(deal.sqm * 400)}–{money(deal.sqm * 900)}</dd></div> : null}
        <div><dt>Keeping it ({run.taxName}, insurance, basic water and power)</dt><dd>≈ {money(Math.round(yearly / 12))}/month</dd></div>
      </dl>
      <label className="hunt-rent">If you pay rent of <input type="number" min={100} step={50} value={rent} onChange={(e) => setRent(Math.max(0, Number(e.target.value)))} /> € a month, buying this all-in equals <strong>{months} months of rent</strong>.</label>
      <p className="hunt-fine">{COSTS[deal.country]?.note || "Purchase costs vary by country."} {run.extra || ""} Running costs are a rough guide for a small house; ask the seller for the real bills.{reno ? " Renovation ranges are ballpark figures; get a local quote." : ""}</p>
    </section>
  );
}

// ---------------------------------------------------------------- fullscreen gallery
export function Lightbox({ images, start = 0, title, onClose }: { images: string[]; start?: number; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  useEffect(() => {
    const el = ref.current; if (el) el.scrollLeft = start * el.clientWidth;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    document.addEventListener("keydown", key); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, []);
  const go = (n: number) => { const el = ref.current; if (!el) return; el.scrollBy({ left: n * el.clientWidth, behavior: "smooth" }); };
  return (
    <div className="hunt-lightbox" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
      <button className="hunt-lb-close" aria-label="Close photos" onClick={onClose}><X size={22} /></button>
      <div className="hunt-lb-track" ref={ref} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {images.map((src, n) => <div key={n} className="hunt-lb-slide"><img src={src} alt={`${title}, photo ${n + 1}`} loading={Math.abs(n - start) < 2 ? "eager" : "lazy"} /></div>)}
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
      <img src={d.image_urls?.[0] || "/favicon.png"} alt="" loading="lazy" decoding="async" />
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
export function InfoRequest({ deal }: { deal: Row }) {
  const { user } = useAuth();
  const { requireUser, setNotice } = useCommunity();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", intent: "visit", message: "" });
  if (done) return <p className="hunt-info-done"><Check size={16} /> Request sent. We check it is still available and put you in touch with the seller, usually within two working days.</p>;
  return (
    <div className="hunt-info">
      {!open ? (
        <button className="hunt-secondary" onClick={() => { if (!user) { requireUser(); return; } setOpen(true); }}><Mail size={16} /> {t("Ask about this home")}</button>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try { await rpc("community_request_info", { p_deal: deal.id, p_name: f.name, p_phone: f.phone, p_intent: f.intent, p_message: f.message }); setDone(true); }
          catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
        }}>
          <strong>{t("Ask about this home")}</strong>
          <p className="hunt-fine">We check it is still for sale and put you in touch with the seller. Your email stays private until you agree.</p>
          <input required placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input placeholder="Phone or WhatsApp (optional)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <select value={f.intent} onChange={(e) => setF({ ...f, intent: e.target.value })}>
            <option value="visit">I want to visit it</option>
            <option value="buy">I want to make an offer</option>
            <option value="questions">I have questions</option>
          </select>
          <textarea placeholder="Anything the seller should know? (optional)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <div className="hunt-row"><button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send request"}</button><button type="button" className="hunt-link" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- filters
const PRICE_CAPS = [20000, 40000, 60000, 80000, 100000];
export function Filters({ countries, value, onChange }: { countries: Record<string, number>; value: FeedParams; onChange: (v: FeedParams) => void }) {
  const list = Object.entries(countries || {}).sort((a, b) => b[1] - a[1]);
  const active = !!(value.country || value.category || value.max_price || value.min_sqm || (value.sort && value.sort !== "rank"));
  const extra = [value.category, value.max_price, value.min_sqm, value.sort && value.sort !== "rank" ? value.sort : ""].filter(Boolean).length;
  const [open, setOpen] = useState(() => (typeof window !== "undefined" && window.innerWidth > 700) || extra > 0);
  return (
    <div className={"hunt-filters" + (open ? " is-open" : "")}>
      <div className="hunt-chips" role="group" aria-label="Country">
        <button aria-pressed={!value.country} onClick={() => onChange({ ...value, country: "" })}>{t("All countries")}</button>
        {list.map(([c, n]) => <button key={c} aria-pressed={value.country === c} onClick={() => onChange({ ...value, country: c })}>{c} <small>{n}</small></button>)}
      </div>
      <button type="button" className="hunt-link hunt-filter-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? t("Hide filters") : t("More filters")}{extra > 0 ? ` (${extra})` : ""}</button>
      {open && <div className="hunt-filter-row">
        <label><span>{t("Max price")}</span>
          <select value={value.max_price || ""} onChange={(e) => onChange({ ...value, max_price: e.target.value ? Number(e.target.value) : null })}>
            <option value="">€100,000</option>
            {PRICE_CAPS.slice(0, -1).map((p) => <option key={p} value={p}>{money(p)}</option>)}
          </select></label>
        <label><span>{t("Any type")}</span>
          <select value={value.category || ""} onChange={(e) => onChange({ ...value, category: e.target.value })}>
            <option value="">{t("Any type")}</option>
            {categories.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label><span>{t("Min size")}</span>
          <select value={value.min_sqm || ""} onChange={(e) => onChange({ ...value, min_sqm: e.target.value ? Number(e.target.value) : null })}>
            <option value="">—</option>
            {[40, 60, 80, 100, 150].map((s) => <option key={s} value={s}>{s} m²+</option>)}
          </select></label>
        <label><span>{t("Sort")}</span>
          <select value={value.sort || "rank"} onChange={(e) => onChange({ ...value, sort: e.target.value })}>
            <option value="rank">{t("Top voted")}</option><option value="new">{t("Newest")}</option>
            <option value="price_asc">{t("Cheapest")}</option><option value="sqm">{t("Biggest")}</option>
          </select></label>
        {active && <button className="hunt-link" onClick={() => onChange({ scope: value.scope })}>{t("Clear filters")}</button>}
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
      {state === "ok" ? <p className="hunt-info-done"><Check size={16} /> Saved. We will email you new matches, one email a day at most.</p> : (
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
  useEffect(() => { document.title = "Alerts for homes under €100,000 · RealHunt"; feed({ limit: 1 }).then((f) => setCountries(Object.keys(f.countries_count || {}))).catch(() => {}); }, []);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{t("Alerts")}</span>
      <h1>Get new homes that match you</h1>
      <p>Choose countries, budget and type. One email a day at most, only when something new matches. Unsubscribe with one click.</p>
      <AlertForm countries={countries} />
    </div>
  );
}

// ---------------------------------------------------------------- explore strip
export function ExploreLinks() {
  return (
    <nav className="hunt-explore" aria-label={t("Explore")}>
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
  useEffect(() => { document.title = "Swipe homes under €100,000 · RealHunt"; feedAll({}).then((f) => setRows(f.rows)).catch(() => setRows([])); }, []);
  const list = useMemo(() => (rows || []).filter((r) => !session?.votes?.[r.id]), [rows, session?.token]);
  const d = list[i];
  async function decide(like: boolean) {
    if (!d) return;
    bumpIx();
    setDx(like ? 600 : -600);
    if (like && session) {
      try {
        await call("vote", { id: d.id, value: 1 });
        setSession((s: any) => ({ ...s, votes: { ...s.votes, [d.id]: 1 } }));
        const days = bumpStreak();
        setNotice(`${t("Your vote counts.")}${days > 1 ? ` ${days} ${t("days in a row")}.` : ""}`);
      } catch (e) { setNotice((e as Error).message); }
    }
    setTimeout(() => { setDx(0); if (!like) setI((n) => n + 1); }, 180);
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") decide(true); if (e.key === "ArrowLeft") decide(false); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  if (!rows) return <div className="hunt-wrap"><div className="hunt-skeleton-swipe" /></div>;
  return (
    <div className="hunt-wrap hunt-swipe">
      <h1>{t("Swipe")}</h1>
      <p className="hunt-fine">Right to vote, left to skip. {list.length} homes left.</p>
      {!d ? (
        <div className="hunt-empty"><h3>You have seen every home this week.</h3><p>New homes are added every week.</p><Link className="hunt-primary" to="/map">{t("Map")}</Link></div>
      ) : (
        <>
          <div className="hunt-swipe-card" style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: start.current === null ? "transform .18s ease" : "none" }}
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
            <button aria-label="Skip" onClick={() => decide(false)}><X size={26} /></button>
            <Link to={`/deal/${d.slug}`} className="hunt-link">Details</Link>
            <button aria-label="Vote" className="is-like" onClick={() => decide(true)}><Heart size={26} /></button>
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
        <div className="hunt-empty"><Trophy size={30} /><h3>The board is empty. The first hunter takes #1.</h3><p>Submit a home under €100,000 that people should see.</p><Link className="hunt-primary" to="/submit">{t("Submit a Deal")}</Link></div>
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
      <p>Every friend who joins with your link gives you 5 hunter points. Bring three and you get the Connector badge on the leaderboard. Your friends get the full listing links as soon as they sign in.</p>
      {!user ? <button className="hunt-primary" onClick={() => requireUser()}>{t("Sign in")}</button> : !me ? <div className="hunt-skeleton-list" /> : (
        <div className="hunt-invite">
          <code>{link}</code>
          <div className="hunt-row">
            <button className="hunt-primary" onClick={() => (navigator.share ? navigator.share({ title: "RealHunt", text: "Real homes under €100,000, ranked by people. Join me:", url: link }) : navigator.clipboard.writeText(link).then(() => setNotice("Link copied ✓"))).catch(() => {})}><Share2 size={16} /> {t("Share")}</button>
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
      <div className="hunt-row"><Link className="hunt-primary" to={`/homes/${country}`}>Homes under €100,000 in {g.name}</Link><Link className="hunt-secondary" to="/help-buying">{t("Help buying")}</Link></div>
      {homes.length > 0 && <><h2>Voted homes in {g.name}</h2><div className="hunt-minigrid">{homes.map((d) => <MiniCard key={d.id} d={d} />)}</div></>}
    </div>
  );
}
export function HomesPage() {
  const { country = "", cap = "" } = useParams();
  const name = country ? country.charAt(0).toUpperCase() + country.slice(1).toLowerCase() : "";
  const max = Number((cap.match(/\d+/) || [])[0]) || 100000;
  const [data, setData] = useState<{ rows: Row[]; total: number } | null>(null);
  useEffect(() => {
    document.title = `Homes under ${money(max)} in ${name} · RealHunt`;
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute("content", `Houses for sale under ${money(max)} in ${name}, found by people and ranked by votes. Updated every day.`);
    setData(null); feed({ scope: "all", country: name, max_price: max, limit: 60 }).then(setData).catch(() => setData({ rows: [], total: 0 }));
  }, [country, cap]);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow">{name}</span>
      <h1>Homes under {money(max)} in {name}</h1>
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
export function LangSwitch() {
  if (true as boolean) return null; // English only for now
  const [l, setL] = useState<Lang>(getLang());
  return (
    <label className="hunt-lang"><span className="sr-only">{t("Language")}</span>
      <select value={l} onChange={(e) => { const v = e.target.value as Lang; setL(v); setLang(v); }}>
        {LANGS.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
      </select>
    </label>
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
    <section className="hunt-podium" aria-label="This week so far">
      <h2>This week so far</h2>
      <div>{order.map((d, n) => (
        <Link key={d.id} to={`/deal/${d.slug}`} className={"hunt-podium-" + (n === 1 ? 1 : n === 0 ? 2 : 3)}>
          <img src={d.image_urls?.[0]} alt="" loading="lazy" />
          <strong>#{d.rank} · {money(d.price_eur)}</strong>
          <span>{d.week_net} {d.week_net === 1 ? "vote" : "votes"}</span>
          <i />
        </Link>
      ))}</div>
    </section>
  );
}
