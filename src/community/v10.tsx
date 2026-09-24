// RealHunt v10 (24-sep-2026), buyer side:
// - InboxPage (/inbox): chats with developers, alerts on saved projects (price drops, last units, sold out), serious-buyer check.
// - SeriousBuyer: upload proof of funds or a mortgage pre-approval (private bucket, checked by RealHunt).
// - CompareBuilds (/compare-new-builds?d=a,b,c) + CompareToggle on new-build cards.
// - CostsIndex / CostsPage (/costs, /costs/:slug): real buying costs, taxes and rental yields, with sources.
// - NewBuildReport (/research/new-builds): the monthly "state of cheap new builds" report for press.
// - AgentsPage (/agents): local agents refer buyers and earn part of RealHunt's fee.
// - TranslateBar: read a listing in Spanish, German or French.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FLAG } from "@/lib/rh";
import { money } from "./api";
import { useCommunity } from "./ctx";
import IntroChat from "@/components/realhunt/IntroChat";
import DEST from "@/data/destinations.json";
import { Bell, BadgeCheck, Check, ChevronLeft, FileUp, Languages, Loader2, MessageCircle, Scale, ShieldCheck, TrendingDown, Users, X, Download } from "lucide-react";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => { const { data, error } = await (supabase as any).rpc(fn, args); if (error) throw error; return data; };
const setMeta = (title: string, desc: string) => { document.title = title; document.querySelector('meta[name="description"]')?.setAttribute("content", desc); };
const flag = (c?: string | null) => FLAG[c || ""] || "🌍";
const ev = (n: string) => { try { (window as any).clarity?.("event", n); } catch { /* ignore */ } };

// ---------------------------------------------------------------- serious buyer
export function SeriousBuyer({ proof, onDone }: { proof: any; onDone?: () => void }) {
  const { setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("bank_statement");
  if (proof?.status === "verified") return <div className="hv-serious is-ok"><ShieldCheck size={18} /> <span><b>You are a verified serious buyer.</b> Developers see the badge on every request you send.</span></div>;
  const upload = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setNotice("The file is over 10 MB."); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser(); if (!u.user) throw new Error("Sign in first");
      const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("buyer-proof").upload(path, f, { contentType: f.type || undefined, upsert: false });
      if (up.error) throw up.error;
      const r = await rpc("buyer_proof_submit", { p_path: path, p_kind: kind });
      if (r?.error) throw new Error(r.error);
      ev("serious_upload"); setNotice("Thanks. We check it within two working days."); onDone?.();
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="hv-serious">
      <strong><ShieldCheck size={17} /> Get the “Serious buyer” badge</strong>
      <p className="hunt-fine">Developers answer serious buyers first. Upload a recent bank statement showing the funds, or a mortgage pre-approval letter. Only RealHunt sees the file; developers only see the badge. You can cover account numbers.</p>
      {proof?.status === "pending" ? <p className="hunt-fine"><Loader2 size={13} className="animate-spin" style={{ display: "inline" }} /> We are checking your document.</p> : <>
        {proof?.status === "rejected" && <p className="hunt-fine">We could not verify the last file{proof.note ? `: ${proof.note}` : "."} Try another one.</p>}
        <div className="hunt-row">
          <select value={kind} onChange={(e) => setKind(e.target.value)}><option value="bank_statement">Bank statement</option><option value="mortgage">Mortgage pre-approval</option><option value="other">Other proof of funds</option></select>
          <label className="hunt-secondary" style={{ cursor: "pointer" }}>{busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />} Upload PDF or photo<input type="file" accept="application/pdf,image/*" hidden onChange={(e) => upload(e.target.files?.[0])} /></label>
        </div>
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- /inbox
export function InboxPage() {
  const { user, requireUser } = useCommunity();
  const loc = useLocation();
  const nav = useNavigate();
  const [d, setD] = useState<any>(undefined);
  const sel = new URLSearchParams(loc.search).get("t") || "";
  const load = () => rpc("buyer_inbox").then(setD).catch(() => setD(null));
  useEffect(() => { setMeta("Inbox · RealHunt", "Your conversations with developers and alerts on the homes you saved."); if (user) load(); }, [user?.id]);
  useEffect(() => { if (d?.alerts?.some((a: any) => !a.read)) { (supabase as any).from("notifications").update({ read: true }).in("id", d.alerts.filter((a: any) => !a.read).map((a: any) => a.id)).then(() => {}); } }, [d?.alerts?.length]);
  if (!user) return <div className="hunt-wrap hunt-page"><h1>Inbox</h1><p>Sign in to see your conversations with developers and alerts on saved homes.</p><button className="hunt-primary" onClick={() => requireUser()}>Sign in</button></div>;
  if (d === undefined) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  const threads: any[] = d?.threads || []; const alerts: any[] = d?.alerts || [];
  const cur = threads.find((t) => t.id === sel);
  return (
    <div className="hunt-wrap hunt-page hv-inbox">
      <h1>Inbox</h1>
      <SeriousBuyer proof={d?.proof} onDone={load} />
      {cur ? (
        <section className="hv-inbox-thread">
          <button className="hunt-link" onClick={() => nav("/inbox")}><ChevronLeft size={15} /> All conversations</button>
          <h2>{cur.developer}{cur.deal ? <small> · <Link to={`/deal/${encodeURIComponent(cur.slug)}`}>{cur.deal}</Link></small> : null}</h2>
          <IntroChat id={cur.id} />
        </section>
      ) : (
        <section>
          <h2><MessageCircle size={18} /> Conversations</h2>
          {threads.length === 0 ? <p className="hunt-fine">When you ask a developer about a new build, the conversation appears here. <Link to="/new-builds">See new builds</Link></p> : (
            <ul className="hv-inbox-list">{threads.map((t) => (
              <li key={t.id}><button onClick={() => nav(`/inbox?t=${t.id}`)}>
                <span className="hv-board-thumb">{t.image && <img src={t.image} alt="" />}</span>
                <span><strong>{t.developer}{t.unread > 0 ? <b className="hv-dot">{t.unread}</b> : null}</strong><small>{t.deal || ""}{t.as === "agent" ? " · you referred this buyer" : ""}</small><small className="hv-inbox-last">{t.last || "No messages yet. Say hello."}</small></span>
              </button></li>
            ))}</ul>
          )}
          <h2 style={{ marginTop: 28 }}><Bell size={18} /> Alerts on saved homes</h2>
          {alerts.length === 0 ? <p className="hunt-fine">Save a new build and we tell you here when its price drops, when the last units are left, or when it sells out.</p> : (
            <ul className="hv-alerts">{alerts.map((a) => (
              <li key={a.id} className={a.read ? "" : "is-new"}><Link to={a.meta?.link || "/inbox"}>{a.type === "price_drop" ? <TrendingDown size={16} /> : a.type === "message" ? <MessageCircle size={16} /> : a.type === "serious_buyer" ? <ShieldCheck size={16} /> : <Bell size={16} />}<span><strong>{a.title}</strong><small>{a.body}</small></span></Link></li>
            ))}</ul>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- compare new builds
const CMP = "rh_cmp";
const readCmp = (): string[] => { try { return JSON.parse(localStorage.getItem(CMP) || "[]"); } catch { return []; } };
export function CompareToggle({ slug }: { slug: string }) {
  const [list, setList] = useState<string[]>(readCmp);
  const on = list.includes(slug);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const next = on ? list.filter((s) => s !== slug) : [...list.filter((s) => s !== slug), slug].slice(-3);
    try { localStorage.setItem(CMP, JSON.stringify(next)); } catch { /* ignore */ }
    setList(next); window.dispatchEvent(new Event("rh-cmp"));
  };
  return <button className={"hv-cmp-toggle" + (on ? " is-on" : "")} onClick={toggle} aria-pressed={on}>{on ? <Check size={13} /> : <Scale size={13} />} {on ? "In compare" : "Compare"}</button>;
}
export function CompareBar() {
  const [list, setList] = useState<string[]>(readCmp);
  useEffect(() => { const h = () => setList(readCmp()); window.addEventListener("rh-cmp", h); return () => window.removeEventListener("rh-cmp", h); }, []);
  if (list.length < 2) return list.length === 1 ? <div className="hv-cmp-bar"><span>Pick one or two more to compare</span></div> : null;
  return <div className="hv-cmp-bar"><span>{list.length} projects picked</span><Link className="hunt-primary" to={`/compare-new-builds?d=${list.map(encodeURIComponent).join(",")}`}><Scale size={15} /> Compare side by side</Link><button className="hunt-link" onClick={() => { try { localStorage.removeItem(CMP); } catch { /* ignore */ } setList([]); window.dispatchEvent(new Event("rh-cmp")); }}>Clear</button></div>;
}
export function CompareBuilds() {
  const loc = useLocation();
  const slugs = (new URLSearchParams(loc.search).get("d") || "").split(",").map(decodeURIComponent).filter(Boolean).slice(0, 3);
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { setMeta("Compare new builds · RealHunt", "Compare new-build projects side by side: price, payment plan, size, units left and developer rating."); rpc("community_compare_builds", { p_slugs: slugs }).then(setRows).catch(() => setRows([])); ev("compare_builds"); }, [loc.search]);
  if (!rows) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  if (rows.length < 2) return <div className="hunt-wrap hunt-page"><h1>Compare new builds</h1><p>Pick two or three projects on the <Link to="/new-builds">new builds page</Link> with the Compare button.</p></div>;
  const reserve = (r: any) => (r.plan?.deposit_pct && r.price_eur ? Math.round(r.price_eur * r.plan.deposit_pct / 100) : null);
  const monthly = (r: any) => (r.plan?.deposit_pct && r.plan?.months && r.price_eur ? Math.round(r.price_eur * (1 - r.plan.deposit_pct / 100 - (r.plan.handover_pct || 0) / 100) / r.plan.months) : null);
  const left = (r: any) => { const u = (r.units || []).filter((x: any) => x.available != null); return u.length ? u.reduce((a: number, x: any) => a + Number(x.available || 0), 0) : null; };
  const per = (r: any) => (r.price_eur && r.sqm ? Math.round(r.price_eur / r.sqm) : null);
  const lines: [string, (r: any) => React.ReactNode, ((r: any) => number | null)?, ("min" | "max")?][] = [
    ["Price from", (r) => money(r.price_eur), (r) => r.price_eur, "min"],
    ["Size", (r) => (r.sqm ? `${r.sqm} m²` : "—"), (r) => r.sqm, "max"],
    ["Price per m²", (r) => (per(r) ? money(per(r)) : "—"), per, "min"],
    ["To reserve", (r) => (reserve(r) ? money(reserve(r)) : "—"), reserve, "min"],
    ["Monthly during works", (r) => (monthly(r) ? `${money(monthly(r))} × ${r.plan.months}` : "—"), monthly, "min"],
    ["Ready", (r) => r.plan?.completion || "—"],
    ["Units left", (r) => (left(r) ?? "—"), left, "max"],
    ["Developer", (r) => <Link to={`/dev/${r.dev_slug}`}>{r.developer}{r.verified ? " ✓" : ""}</Link>],
    ["Buyer rating", (r) => (r.rating ? `★ ${r.rating}` : "—"), (r) => (r.rating ? Number(r.rating) : null), "max"],
    ["Votes · saves", (r) => `${r.votes} · ${r.saves}`, (r) => Number(r.votes) + 2 * Number(r.saves), "max"],
  ];
  const best = (f?: (r: any) => number | null, dir?: "min" | "max") => { if (!f || !dir) return null; const v = rows.map(f).filter((x) => x != null) as number[]; if (v.length < 2) return null; return dir === "min" ? Math.min(...v) : Math.max(...v); };
  return (
    <div className="hunt-wrap hunt-page hv-cmpb">
      <nav className="hv-crumbs"><Link to="/new-builds">New builds</Link> › <span>Compare</span></nav>
      <h1>Compare new builds</h1>
      <div className="hv-cmpb-scroll"><table>
        <thead><tr><th />{rows.map((r) => <th key={r.slug}><Link to={`/deal/${encodeURIComponent(r.slug)}`}><img src={r.image} alt="" /><strong>{r.title}</strong><small>{flag(r.country)} {r.location || r.country}</small></Link></th>)}</tr></thead>
        <tbody>{lines.map(([k, f, v, dir]) => { const b = best(v, dir); return <tr key={k}><th>{k}</th>{rows.map((r) => <td key={r.slug} className={b != null && v && v(r) === b ? "is-best" : ""}>{f(r)}</td>)}</tr>; })}</tbody>
      </table></div>
      <p className="hunt-fine">Green is the better figure on each line. Prices and plans come from the developers and can change; ask them to confirm.</p>
    </div>
  );
}

// ---------------------------------------------------------------- /costs
const D = DEST as Record<string, any>;
export const DEST_NAMES: Record<string, [string, string, string]> = {
  bali: ["Bali", "Indonesia", "indonesia"], lombok: ["Lombok", "Indonesia", "indonesia"], albania: ["Albania", "Albania", "albania"], mexico: ["Mexico", "Mexico", "mexico"],
  spain: ["Spain", "Spain", "spain"], montenegro: ["Montenegro", "Montenegro", "montenegro"], georgia: ["Georgia", "Georgia", "georgia"], "northern-cyprus": ["Northern Cyprus", "Cyprus", "northern-cyprus"],
  vietnam: ["Vietnam", "Vietnam", "vietnam"], italy: ["Italy", "Italy", "italy"], portugal: ["Portugal", "Portugal", "portugal"], bulgaria: ["Bulgaria", "Bulgaria", "bulgaria"],
};
const range = (s?: string | null): [number, number] | null => { const m = String(s || "").match(/([\d.]+)\s*[-–]\s*([\d.]+)/) || String(s || "").match(/([\d.]+)/); return m ? [Number(m[1]), Number(m[2] || m[1])] : null; };
export function CostsIndex() {
  useEffect(() => setMeta("What it really costs to buy a cheap home abroad · RealHunt", "Buying costs, property tax, rental tax and holiday-rental yields in Bali, Albania, Mexico, Spain, Georgia, Vietnam and more. With sources."), []);
  const rows = Object.keys(DEST_NAMES).filter((k) => D[k]);
  return (
    <div className="hunt-wrap hunt-page hv-sp">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <span>Real costs</span></nav>
      <h1>What it really costs to buy abroad</h1>
      <p>Taxes and fees on top of the price, yearly tax, tax on rent, and what holiday rentals really earn. Every figure links to its source. Compiled {D._meta?.compiled}.</p>
      <div className="hv-costs-table"><table><thead><tr><th>Destination</th><th>Costs on top of price</th><th>Holiday-rental yield (gross)</th><th>Long-term rent yield (gross)</th></tr></thead>
        <tbody>{rows.map((k) => <tr key={k}><td><Link to={`/costs/${k}`}>{flag(DEST_NAMES[k][1])} {DEST_NAMES[k][0]}</Link></td><td>{D[k].purchase_costs_pct ? `${D[k].purchase_costs_pct}%` : "—"}</td><td>{D[k].holiday_rental_gross_yield_pct ? `${D[k].holiday_rental_gross_yield_pct}%` : "no reliable figure"}</td><td>{D[k].long_term_gross_yield_pct ? `${String(D[k].long_term_gross_yield_pct).split(" (")[0]}%` : "—"}</td></tr>)}</tbody></table></div>
      <p className="hunt-fine">This is general information, not tax or legal advice. Rules change; check with a local lawyer before you buy.</p>
    </div>
  );
}
export function CostsPage() {
  const { slug = "" } = useParams();
  const d = D[slug]; const n = DEST_NAMES[slug];
  const [price, setPrice] = useState(80000);
  useEffect(() => { if (n) setMeta(`Buying a home in ${n[0]}: real costs, taxes and rental yield · RealHunt`, `What you pay on top of the price in ${n[0]}, yearly property tax, tax on rental income and what holiday rentals earn. With sources.`); }, [slug]);
  if (!d || !n) return <div className="hunt-wrap hunt-page"><h1>Not found</h1><Link to="/costs">All destinations</Link></div>;
  const r = range(d.purchase_costs_pct);
  const rows: [string, string | null][] = [
    ["Can foreigners buy?", d.can_foreigners_buy], ["Costs on top of the price", d.purchase_costs_pct ? `${d.purchase_costs_pct}% · ${d.purchase_costs_breakdown || ""}` : null],
    ["Yearly property tax", d.annual_property_tax], ["Tax on rental income", d.rental_income_tax],
    ["Holiday-rental yield", d.holiday_rental_gross_yield_pct ? `${d.holiday_rental_gross_yield_pct}% gross` : null], ["What holiday rentals earn", d.holiday_rental_yield_note],
    ["Long-term rent yield", d.long_term_gross_yield_pct ? `${d.long_term_gross_yield_pct}% gross` : null], ["Holiday-rental rules", d.holiday_rental_rules],
  ];
  return (
    <div className="hunt-wrap hunt-page hv-sp hv-costs">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/costs">Real costs</Link> › <span>{n[0]}</span></nav>
      <h1>Buying a home in {n[0]}: what it really costs</h1>
      {r && <div className="hv-costcalc">
        <label>Price of the home <input type="number" min={5000} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></label>
        <p>You pay about <b>{money(Math.round(price * (1 + r[0] / 100)))}</b>{r[1] !== r[0] ? <> to <b>{money(Math.round(price * (1 + r[1] / 100)))}</b></> : null} in total, of which <b>{money(Math.round(price * r[0] / 100))}{r[1] !== r[0] ? `–${money(Math.round(price * r[1] / 100))}` : ""}</b> is taxes and fees.</p>
      </div>}
      <dl className="hv-costs-dl">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="hunt-fine">Figures as of {d.as_of}. General information, not tax or legal advice.</p>
      <h2>Sources</h2>
      <ul className="hv-sources">{(d.sources || []).map((s: string) => <li key={s}><a href={s} target="_blank" rel="noopener noreferrer nofollow">{s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 80)}</a></li>)}</ul>
      <p style={{ marginTop: 22 }}><Link className="hunt-primary" to={`/new-builds/${n[2]}`}>New builds under €100,000 in {n[1]}</Link> <Link className="hunt-link" to="/costs">Other destinations</Link></p>
    </div>
  );
}

// ---------------------------------------------------------------- monthly report
export function NewBuildReport() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { setMeta("State of cheap new builds · RealHunt monthly report", "Every month: how many new-build homes under €100,000 we track, the cheapest countries and median prices. Free to quote with a link."); rpc("community_newbuild_report").then(setD).catch(() => setD({ rows: [] })); }, []);
  const csv = () => {
    const lines = ["country,projects,from_eur,median_eur,under_60k", ...(d?.rows || []).map((r: any) => [r.country, r.n, r.min, r.median, r.under60].join(","))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = `realhunt-new-builds-${d?.updated || "report"}.csv`; a.click();
  };
  return (
    <div className="hunt-wrap hunt-page hv-sp hv-report">
      <nav className="hv-crumbs"><Link to="/blog">Research</Link> › <span>State of cheap new builds</span></nav>
      <span className="hunt-eyebrow">Monthly report · {d?.month || ""}</span>
      <h1>The state of cheap new builds</h1>
      {!d ? <div className="hunt-skeleton-list" /> : <>
        <div className="hv-report-kpis">
          <div><b>{d.projects}</b><small>new-build projects under €100,000 tracked</small></div>
          <div><b>{d.countries}</b><small>countries</small></div>
          <div><b>{d.median ? money(d.median) : "—"}</b><small>median starting price</small></div>
          <div><b>{d.live_on_realhunt}</b><small>listed by their developers on RealHunt</small></div>
        </div>
        <h2>By country</h2>
        <div className="hv-costs-table"><table><thead><tr><th>Country</th><th>Projects</th><th>Cheapest from</th><th>Median from</th><th>Under €60,000</th></tr></thead>
          <tbody>{d.rows.map((r: any) => <tr key={r.country}><td>{flag(r.country)} {r.country}</td><td>{r.n}</td><td>{money(r.min)}</td><td>{money(r.median)}</td><td>{r.under60}</td></tr>)}</tbody></table></div>
        <button className="hunt-secondary" onClick={csv}><Download size={15} /> Download the data (CSV)</button>
        <h2>How we count</h2>
        <p>Projects are new-build homes (apartments, villas, townhouses; no land) whose developer publishes a starting price at or under €100,000, found on the developers' own websites and listings, plus projects listed on RealHunt by their developers. Prices are converted to euros at the time we record them. Countries with fewer than three projects are left out. Updated {d.updated}.</p>
        <p className="hunt-fine">Press: free to quote or chart with a link to realhunt.co/research/new-builds. Questions: hello@realhunt.co.</p>
        <p><Link to="/costs" className="hunt-link">Real buying costs and rental yields by country →</Link></p>
      </>}
    </div>
  );
}

// ---------------------------------------------------------------- agents
export function AgentsPage() {
  const { user, requireUser, setNotice } = useCommunity();
  const [me, setMe] = useState<any>(undefined);
  const [projects, setProjects] = useState<any[]>([]);
  const [j, setJ] = useState({ name: "", agency: "", country: "", phone: "", website: "" });
  const [r, setR] = useState({ deal: "", name: "", email: "", phone: "", note: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = () => rpc("agent_me").then(setMe).catch(() => setMe(null));
  useEffect(() => { setMeta("RealHunt Agents · Earn from buyers you bring", "Local agents introduce buyers to new-build developers on RealHunt and earn 30% of RealHunt's fee when they buy."); if (user) { load(); rpc("agent_projects").then(setProjects).catch(() => {}); } else setMe(null); }, [user?.id]);
  const join = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { const x = await rpc("agent_join", { p_name: j.name, p_agency: j.agency, p_country: j.country, p_phone: j.phone, p_website: j.website }); if (x?.error) setNotice(x.error); else { ev("agent_join"); load(); } } catch (err) { setNotice((err as Error).message); } finally { setBusy(false); } };
  const refer = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { const x = await rpc("agent_refer", { p_deal: r.deal, p_name: r.name, p_email: r.email, p_phone: r.phone, p_note: r.note, p_consent: consent }); if (x?.error) setNotice(x.error); else { ev("agent_refer"); setNotice(`Sent to ${x.developer}. Follow it in your inbox.`); setR({ deal: "", name: "", email: "", phone: "", note: "" }); setConsent(false); load(); } } catch (err) { setNotice((err as Error).message); } finally { setBusy(false); } };
  return (
    <div className="hunt-wrap hunt-page hv-sp hv-agents">
      <span className="hunt-eyebrow"><Users size={13} /> RealHunt Agents</span>
      <h1>Bring buyers to new builds. Earn when they buy.</h1>
      <p>You know buyers; our developers have homes under €100,000. Introduce a buyer to a project on RealHunt and, if they buy, you get <b>30% of RealHunt's fee</b> (that is 1.5% of the price on a 5% fee). The developer pays nothing extra.</p>
      <ol className="hv-steps"><li>Join (free, one minute).</li><li>Pick a project and add your buyer, with their OK.</li><li>The developer gets the buyer with your name on it. You follow the conversation in your inbox.</li><li>When the sale closes and the developer pays RealHunt, we pay you within 30 days.</li></ol>
      {!user ? <button className="hunt-primary" onClick={() => requireUser()}>Sign in to join</button> : me === undefined ? <Loader2 className="animate-spin" /> : !me?.agent ? (
        <form className="hv-form" onSubmit={join}>
          <strong>Join as an agent</strong>
          <input required placeholder="Your full name" value={j.name} onChange={(e) => setJ({ ...j, name: e.target.value })} />
          <input placeholder="Agency (optional)" value={j.agency} onChange={(e) => setJ({ ...j, agency: e.target.value })} />
          <input placeholder="Country you work in" value={j.country} onChange={(e) => setJ({ ...j, country: e.target.value })} />
          <input placeholder="Phone or WhatsApp" value={j.phone} onChange={(e) => setJ({ ...j, phone: e.target.value })} />
          <input placeholder="Website (optional)" value={j.website} onChange={(e) => setJ({ ...j, website: e.target.value })} />
          <p className="hunt-fine">Payouts follow the RealHunt Network terms: you are paid only after the developer pays RealHunt for that sale. A buyer the developer already knew does not count.</p>
          <button className="hunt-primary" disabled={busy}>{busy ? "Joining…" : "Join free"}</button>
        </form>
      ) : (<>
        <form className="hv-form" onSubmit={refer}>
          <strong>Introduce a buyer</strong>
          <select required value={r.deal} onChange={(e) => setR({ ...r, deal: e.target.value })}><option value="">Pick a project</option>{projects.map((p) => <option key={p.id} value={p.id}>{flag(p.country)} {p.title} · {money(p.price_eur)} · {p.developer}</option>)}</select>
          {projects.length === 0 && <p className="hunt-fine">The first developer projects are going live now. Come back soon.</p>}
          <input required placeholder="Buyer's name" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          <input required type="email" placeholder="Buyer's email" value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} />
          <input placeholder="Buyer's phone (optional)" value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} />
          <textarea placeholder="What are they looking for? Budget, timing…" value={r.note} onChange={(e) => setR({ ...r, note: e.target.value })} />
          <label className="hv-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> <span>The buyer agreed that I pass their name, email and phone to this developer through RealHunt.</span></label>
          <button className="hunt-primary" disabled={busy || !consent}>{busy ? "Sending…" : "Send to the developer"}</button>
        </form>
        <h2>Your buyers</h2>
        {(me.referrals || []).length === 0 ? <p className="hunt-fine">None yet.</p> : <ul className="hv-alerts">{me.referrals.map((x: any, i: number) => <li key={i}><Link to={`/deal/${encodeURIComponent(x.slug)}`}><BadgeCheck size={16} /><span><strong>{x.name} → {x.developer}</strong><small>{x.deal} · {x.status} · {new Date(x.at).toLocaleDateString("en-GB")}</small></span></Link></li>)}</ul>}
        <p><Link to="/inbox" className="hunt-link">Open your inbox →</Link></p>
      </>)}
    </div>
  );
}

// ---------------------------------------------------------------- translate a listing
const LANGS: [string, string][] = [["es", "Español"], ["de", "Deutsch"], ["fr", "Français"]];
export function TranslateBar({ text }: { text: string }) {
  const [out, setOut] = useState<{ lang: string; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const clean = useMemo(() => text.slice(0, 4000), [text]);
  const go = async (lang: string) => {
    ev("translate_" + lang); setBusy(lang);
    try {
      const T = (window as any).Translator;
      if (T?.create) {
        const av = await T.availability?.({ sourceLanguage: "en", targetLanguage: lang });
        if (av && av !== "unavailable") { const tr = await T.create({ sourceLanguage: "en", targetLanguage: lang }); setOut({ lang, text: await tr.translate(clean) }); return; }
      }
      window.open(`https://translate.google.com/?sl=auto&tl=${lang}&op=translate&text=${encodeURIComponent(clean)}`, "_blank", "noopener");
    } catch { window.open(`https://translate.google.com/?sl=auto&tl=${lang}&op=translate&text=${encodeURIComponent(clean)}`, "_blank", "noopener"); }
    finally { setBusy(""); }
  };
  return (
    <div className="hv-translate">
      <span><Languages size={15} /> Read in</span>
      {LANGS.map(([k, l]) => <button key={k} className={out?.lang === k ? "is-on" : ""} onClick={() => go(k)} disabled={!!busy}>{busy === k ? <Loader2 size={13} className="animate-spin" /> : l}</button>)}
      {out && <div className="hv-translate-out"><button aria-label="Close translation" onClick={() => setOut(null)}><X size={14} /></button><p>{out.text}</p><small>Machine translation in your browser.</small></div>}
    </div>
  );
}

// ---------------------------------------------------------------- header inbox icon with unread count
export function InboxLink() {
  const { user } = useCommunity();
  const loc = useLocation();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    (supabase as any).from("notifications").select("id", { count: "exact", head: true }).eq("read", false).in("type", ["price_drop", "sold_out", "few_left", "message", "serious_buyer"])
      .then(({ count }: any) => setN(count || 0), () => {});
  }, [user?.id, loc.pathname]);
  if (!user) return null;
  return <Link to="/inbox" aria-label={n ? `Inbox, ${n} new` : "Inbox"} className="hv-inbox-link"><MessageCircle size={19} />{n > 0 && <b>{n > 9 ? "9+" : n}</b>}</Link>;
}
