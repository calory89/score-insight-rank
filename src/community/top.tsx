// RealHunt Top 100 (30-sep-2026): the best new-build projects of each destination (Bali, Phuket, Tulum, Batumi).
// Lives on its own pages (/top, /top/:dest and /top/:dest/:slug), never in the main feed.
// Order = a base score (price, price per m², area, build stage, how complete the listing is, developer track record)
// plus buyer demand (votes, saves, questions, website clicks, views), so the list moves with what people choose.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sid } from "@/lib/rh";
import { useCommunity } from "./ctx";
import { Lightbox } from "./extras";
import { LegalBox, MoneyNote, PriceVsArea, QaList, ReviewAndReport, ReviewReply, ReviewsBox, VerifiedBox, VisitBadge, VisitBox } from "./topTrustUI";
import { ArrowDown, ArrowUp, BadgeCheck, Camera, Bookmark, Building2, Check, ChevronLeft, ExternalLink, FileUp, Heart, Loader2, MapPin, MessageCircle, Share2, ShieldCheck, Trophy, X } from "lucide-react";
import { t } from "./i18n";

const rpc = async (fn: string, args: Record<string, unknown> = {}) => { const { data, error } = await (supabase as any).rpc(fn, args); if (error) throw error; return data; };
const ev = (n: string) => { try { (window as any).clarity?.("event", n); } catch { /* ignore */ } };
const eur = (n?: number | null) => (n == null ? "–" : "€" + Math.round(n).toLocaleString("en-GB"));
const setMeta = (title: string, desc: string, url: string, image?: string) => {
  document.title = title;
  const set = (sel: string, attr: string, val: string) => document.querySelector(sel)?.setAttribute(attr, val);
  set('meta[name="description"]', "content", desc); set('link[rel="canonical"]', "href", url);
  set('meta[property="og:title"]', "content", title); set('meta[property="og:description"]', "content", desc); set('meta[property="og:url"]', "content", url);
  if (image) { set('meta[property="og:image"]', "content", image); set('meta[name="twitter:image"]', "content", image); }
};

export const TOP_DESTS: Record<string, { name: string; country: string; checked: number; date: string; reg: string; permit: string; fx?: string; n?: number }> = {
  bali: { name: "Bali", country: "Indonesia", checked: 502, date: "29 September 2026", reg: "NIB in Indonesia", permit: "the building permit (PBG)" },
  phuket: { name: "Phuket", country: "Thailand", checked: 468, date: "30 September 2026", reg: "company registration number (DBD)", permit: "the building permit or EIA approval", fx: "Prices converted from Thai baht at about 38 THB per euro." },
  tulum: { name: "Tulum", country: "Mexico", checked: 425, date: "30 September 2026", reg: "RFC", permit: "the construction licence", fx: "Prices converted from US dollars or pesos at the rate of 30 September 2026." },
  samui: { name: "Koh Samui", country: "Thailand", checked: 89, date: "6 October 2026", reg: "company registration number (DBD)", permit: "the building permit", fx: "Prices converted from Thai baht at about 38 THB per euro.", n: 17 },
  batumi: { name: "Batumi", country: "Georgia", checked: 563, date: "30 September 2026", reg: "company ID (identification code)", permit: "the construction permit", fx: "Prices converted from US dollars at about 1.13 USD per euro." },
};
export const TOP_ORDER = ["bali", "phuket", "tulum", "batumi", "samui"];
export const TL = (k?: string) => `Top ${(k && TOP_DESTS[k]?.n) || 100}`;
const AREAS_BY: Record<string, [string, RegExp][]> = {
  phuket: [["Bang Tao & Laguna", /bang tao|laguna|cherng talay|layan/i], ["Surin & Kamala", /surin|kamala/i], ["Patong, Kata & Karon", /patong|kata|karon|kalim/i], ["Rawai & Nai Harn", /rawai|nai ?harn|naiharn|chalong|panwa/i], ["North (Nai Yang, Mai Khao)", /nai yang|mai khao|nai thon|thalang/i], ["Town & east", /town|kathu|koh kaew|yamu|ao po/i]],
  tulum: [["La Veleta", /veleta/i], ["Aldea Zama & Selvazama", /zama/i], ["Region 15 & Holistika", /region 15|holistika/i], ["Centro", /centro|aldea tulum/i], ["Beach & coast", /beach|tankah|soliman|akumal|chemuyil/i]],
  samui: [["Chaweng", /chaweng/i], ["Bophut, Bangrak & Choeng Mon", /bophut|bangrak|bang rak|choeng mon|plai laem/i], ["Lamai", /lamai/i], ["Maenam & Bang Por", /maenam|bang ?po/i]],
  batumi: [["Airport district", /airport/i], ["Batumi Boulevard", /boulevard/i], ["Centre & old town", /old city|rustaveli|downtown|khimshiashvili|tamar|agmashenebeli|centre/i], ["Bagrationi & Javakhishvili", /bagrationi|javakhishvili|kakhaberi/i], ["Makhinjauri & north", /makhinjauri|chakvi|green cape|mtsvane/i]],
};
const AREAS_BALI: [string, RegExp][] = [["Canggu", /canggu|pererenan|berawa|umalas|kerobokan|seminyak|north kuta|seseh|cemagi|nyanyi|kedungu|tabanan|beraban/i], ["Uluwatu & Bukit", /uluwatu|ungasan|pecatu|bingin|melasti|balangan|pandawa|kutuh|nyang/i], ["Ubud", /ubud|sayan|tegallalang|kedewatan|gianyar/i], ["Nusa Dua & Jimbaran", /nusa dua|benoa|jimbaran|kampial|sawangan/i], ["Sanur & Denpasar", /sanur|denpasar/i]];
const areasFor = (dest: string) => AREAS_BY[dest] || AREAS_BALI;
export const areaOf = (dest: string, loc?: string) => areasFor(dest).find(([, re]) => re.test(loc || ""))?.[0] || "Other";
export const DIMS: [string, string, string][] = [
  ["price", "Price", "How cheap the entry price is next to the other projects in this Top 100"],
  ["value", "Value per m²", "How low the price per m² is next to the other projects here"],
  ["location", "Location", "How close it is to the busiest beaches, towns and services"],
  ["beach", "Beach", "Straight-line distance to the sea, measured on the map. Same scale in every destination"],
  ["facilities", "Facilities", "Pool, gym, spa, coworking, security and more, from what the listing shows. Same scale in every destination"],
  ["delivery", "Delivery", "Ready homes score most, then the ones finishing soonest"],
  ["developer", "Developer", "Track record: finished projects and how long they have been building"],
  ["space", "Space", "Size of the smallest unit next to the other projects here"],
  ["demand", "Visitor interest", "How many people viewed, saved, voted for or asked about it on RealHunt, next to the other projects here"],
  ["transparency", "Listing detail", "How much the developer publishes: prices, sizes, dates, photos"],
];
export const AMEN: [string, string][] = [["pool", "Pool"], ["gym", "Gym"], ["spa", "Spa & sauna"], ["cowork", "Coworking"], ["rooftop", "Rooftop"], ["restaurant", "Restaurant or bar"], ["security", "Security"], ["parking", "Parking"], ["kids", "Kids area"], ["garden", "Garden"], ["yoga", "Yoga"], ["sport", "Tennis or padel"], ["lift", "Lift"], ["cinema", "Cinema"], ["bbq", "BBQ"], ["furnished", "Furnished"], ["smart", "Smart home"]];
const AMEN_FILTER = ["pool", "gym", "spa", "cowork", "rooftop", "security", "kids"];
export const tone = (v?: number | null) => (v == null ? "is-na" : v >= 80 ? "is-great" : v >= 60 ? "is-good" : v >= 40 ? "is-ok" : "is-low");
export const seaText = (km?: number | null) => (km == null ? "" : km < 0.3 ? "On the beach" : km < 1 ? `${Math.round(km * 1000 / 50) * 50} m to the sea` : `${Number(km).toFixed(1)} km to the sea`);
const yearOf = (c?: string | null) => (c?.startsWith("Ready") ? 0 : Number((c || "").match(/20(\d\d)/)?.[1] || 99) + 2000);
export function DimBars({ dims, keys, mini }: { dims: any; keys?: string[]; mini?: boolean }) {
  if (!dims) return null;
  const list = keys ? DIMS.filter(([k]) => keys.includes(k)).sort((a, b) => keys.indexOf(a[0]) - keys.indexOf(b[0])) : DIMS;
  return (
    <div className={mini ? "tp-dims is-mini" : "tp-dims"}>
      {list.map(([k, l, h]) => { const v = dims[k]; return (
        <div key={k} className={"tp-dim " + tone(v)} title={h}>
          <span>{l}</span><i><b style={{ width: `${Math.max(4, v || 0)}%` }} /></i><em>{v ?? "–"}</em>
        </div>); })}
    </div>
  );
}

function Move({ rank, base }: { rank: number; base: number }) {
  const d = base - rank;
  if (!d) return <span className="tp-move is-flat">·</span>;
  return d > 0 ? <span className="tp-move is-up" title={`${d} places up thanks to buyers`}><ArrowUp size={12} />{d}</span> : <span className="tp-move is-down" title={`${-d} places down`}><ArrowDown size={12} />{-d}</span>;
}

function HowItWorks({ dest }: { dest: string }) {
  const D = TOP_DESTS[dest];
  return (
    <details className="tp-how">
      <summary>How the ranking works</summary>
      <p>{`We checked ${D.checked} new-build projects listed for sale in ${D.name} and kept the ${D.n || 100} that pass our rules (price, photos, a named developer with a website and phone). Then buyers decide: every vote, save and question moves a project up.`}</p>
      <p>The grade is the average of 10 scores from 0 to 100. Nothing else is added: no bonus and no hidden weights.</p>
      <ul className="tp-how-dims">{DIMS.map(([k, l, h]) => <li key={k}><b>{l}</b>: {h}.</li>)}</ul>
      <p>Price, value per m², space and visitor interest compare a project with the others in this ranking. Beach and facilities use the same scale in every destination. Votes, saves and questions raise visitor interest, so buyers move the ranking. One vote and one save per person, and nobody can pay to move up. A verified developer gets 100 in listing detail, because we have seen their papers.</p>
      <p className="hunt-fine">Prices, sizes and dates come from the public listings on {D.date}. {D.fx ? D.fx + " " : ""}They change, so check with the developer before you decide. This is a ranking, not advice to buy. <Link className="hunt-link" to="/top/how-we-rank">The full formula, sources and how we make money</Link></p>
    </details>
  );
}

export function TopListPage() {
  const loc = useLocation();
  const dest = (loc.pathname.split("/")[2] || "bali").toLowerCase();
  const D = TOP_DESTS[dest];
  const { user, requireUser, setNotice } = useCommunity();
  const [rows, setRows] = useState<any[] | null>(null);
  const [area, setArea] = useState("All");
  const [kind, setKind] = useState("All");
  const qs0 = new URLSearchParams(loc.search);
  const [sort, setSort] = useState(qs0.get("sort") || "rank");
  const [maxP, setMaxP] = useState(qs0.get("max") || "");
  const [sea, setSea] = useState(qs0.get("sea") || "");
  const [stage, setStage] = useState(qs0.get("stage") || "");
  const [own, setOwn] = useState(qs0.get("own") || "");
  const [minScore, setMinScore] = useState(qs0.get("min") || "");
  const [amen, setAmen] = useState<string[]>((qs0.get("amen") || "").split(",").filter(Boolean));
  useEffect(() => {
    const q = new URLSearchParams();
    if (sort !== "rank") q.set("sort", sort); if (maxP) q.set("max", maxP); if (sea) q.set("sea", sea); if (stage) q.set("stage", stage); if (own) q.set("own", own); if (minScore) q.set("min", minScore); if (amen.length) q.set("amen", amen.join(","));
    const s2 = q.toString(); window.history.replaceState(null, "", loc.pathname + (s2 ? "?" + s2 : ""));
  }, [sort, maxP, sea, stage, own, minScore, amen]);
  const reset = () => { setArea("All"); setKind("All"); setSort("rank"); setMaxP(""); setSea(""); setStage(""); setOwn(""); setMinScore(""); setAmen([]); };
  const load = () => rpc("top_list", { p_dest: dest }).then((r) => setRows(r || [])).catch(() => setRows([]));
  useEffect(() => {
    if (!D) return;
    setMeta(`${TL(dest)} new property developments in ${D.name} · RealHunt`, `The ${D.n || 100} best new villa and apartment developments in ${D.name}, from ${D.checked} projects checked. Ranked by price, area and build stage, then by what buyers vote, save and ask about.`, `https://realhunt.co/top/${dest}`, `https://realhunt.co/top/${dest}/og.jpg`);
    load(); ev("top_list_view");
  }, [dest, user?.id]);
  useEffect(() => { if (D && rows) document.title = `${TL(dest)} new property developments in ${D.name} · RealHunt`; }, [rows]);
  const list = useMemo(() => {
    let r = (rows || []).filter((x) => (area === "All" || areaOf(dest, x.locality) === area) && (kind === "All" || (kind === "Under €100k" ? x.price_eur <= 100000 : x.ptype === kind))
      && (!maxP || (x.price_eur || 9e9) <= Number(maxP)) && (!sea || (x.sea_km ?? 99) <= Number(sea))
      && (!stage || (stage === "ready" ? yearOf(x.completion) === 0 : yearOf(x.completion) <= Number(stage)))
      && (!own || (x.ownership || "").toLowerCase() === own) && (!minScore || (x.nota || 0) >= Number(minScore))
      && amen.every((a) => (x.amen || []).includes(a)));
    if (sort === "price") r = [...r].sort((a, b) => a.price_eur - b.price_eur);
    else if (sort === "votes") r = [...r].sort((a, b) => b.votes - a.votes || a.rank - b.rank);
    else if (sort === "sea") r = [...r].sort((a, b) => (a.sea_km ?? 99) - (b.sea_km ?? 99));
    else if (DIMS.some(([k]) => k === sort)) r = [...r].sort((a, b) => (b.dims?.[sort] ?? -1) - (a.dims?.[sort] ?? -1) || a.rank - b.rank);
    return r;
  }, [rows, area, kind, sort, maxP, sea, stage, own, minScore, amen]);
  const miniKeys = DIMS.some(([k]) => k === sort) && !["price", "beach", "facilities", "location"].includes(sort) ? [sort, "price", "beach", "facilities"] : ["price", "beach", "facilities", "location"];
  const filtered = sort !== "rank" || maxP || sea || stage || own || minScore || amen.length > 0 || area !== "All" || kind !== "All";
  const vote = async (x: any, k: "vote" | "save") => {
    if (!user) { setNotice(k === "vote" ? "Sign in to vote. One vote per person keeps the ranking fair." : "Sign in to save projects."); requireUser(); return; }
    try { const r = await rpc("top_toggle", { p_slug: x.slug, p_kind: k }); if (r?.error) setNotice(r.error); else { ev("top_" + k); load(); } } catch (e) { setNotice((e as Error).message); }
  };
  if (!D) return <TopIndexPage />;
  return (
    <div className="hunt-wrap hunt-page tp">
      <span className="hunt-eyebrow"><Trophy size={13} /> <Link to="/top">REALHUNT RANKINGS</Link></span>
      <h1>{`${TL(dest)} new builds in ${D.name}`}</h1>
      <div className="tp-chips tp-dests">{TOP_ORDER.map((k) => <Link key={k} to={`/top/${k}`} aria-current={k === dest ? "page" : undefined} className={k === dest ? "is-on" : ""}>{TOP_DESTS[k].name}</Link>)}</div>
      <p>{`We picked the ${D.n || 100} best of ${D.checked} new-build projects in ${D.name}. Each one gets 10 scores from 0 to 100, and the grade is their average. Votes, saves and questions from buyers move projects up.`}</p>
      <HowItWorks dest={dest} />
      <div className="tp-filters">
        <div className="tp-chips">{["All", ...areasFor(dest).map((a) => a[0]), "Other"].map((a) => <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>{a}</button>)}</div>
        <div className="tp-chips">{["All", "Under €100k", "Villas", "Apartments", "Townhouses"].map((a) => <button key={a} aria-pressed={kind === a} onClick={() => setKind(a)}>{a}</button>)}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="rank">Rank</option><option value="price">Lowest price</option><option value="sea">Closest to the sea</option><option value="votes">Most votes</option>{DIMS.map(([k, l]) => <option key={k} value={k}>{`Best ${l.toLowerCase()} score`}</option>)}</select></div>
        <div className="tp-selects">
          <select value={maxP} onChange={(e) => setMaxP(e.target.value)} aria-label="Maximum price"><option value="">Any price</option><option value="100000">Up to €100k</option><option value="150000">Up to €150k</option><option value="250000">Up to €250k</option><option value="500000">Up to €500k</option></select>
          <select value={sea} onChange={(e) => setSea(e.target.value)} aria-label="Distance to the sea"><option value="">Any distance to the sea</option><option value="0.5">Under 500 m to the sea</option><option value="1">Under 1 km to the sea</option><option value="2">Under 2 km to the sea</option><option value="5">Under 5 km to the sea</option></select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Build stage"><option value="">Any build stage</option><option value="ready">Ready now</option><option value="2026">Ready by 2026</option><option value="2027">Ready by 2027</option><option value="2028">Ready by 2028</option></select>
          <select value={own} onChange={(e) => setOwn(e.target.value)} aria-label="Ownership"><option value="">Any ownership</option><option value="freehold">Freehold</option><option value="leasehold">Leasehold</option></select>
          <select value={minScore} onChange={(e) => setMinScore(e.target.value)} aria-label="Minimum grade"><option value="">Any grade</option><option value="70">Grade 70+</option><option value="75">Grade 75+</option><option value="80">Grade 80+</option><option value="85">Grade 85+</option></select>
        </div>
        <div className="tp-chips tp-amen">{AMEN_FILTER.map((k) => { const on = amen.includes(k); return <button key={k} aria-pressed={on} onClick={() => setAmen(on ? amen.filter((a) => a !== k) : [...amen, k])}>{on ? <Check size={13} /> : null}<span>{AMEN.find((a) => a[0] === k)?.[1]}</span></button>; })}</div>
        {rows && filtered && <p className="tp-count">{`${list.length} of ${rows.length} projects match.`} <button className="hunt-link" onClick={reset}>Clear filters</button></p>}
      </div>
      {rows === null ? <Loader2 className="animate-spin" /> : list.length === 0 ? <p>No projects match. Try another filter.</p> : (
        <ol className="tp-list">{list.map((x) => (
          <li key={x.slug} className="tp-row">
            <div className="tp-rank"><b>#{x.rank}</b><Move rank={x.rank} base={x.base_rank} /></div>
            <Link to={`/top/${dest}/${x.slug}`} className="tp-thumb"><img src={x.image} alt={x.name} loading={x.rank <= 6 ? "eager" : "lazy"} /></Link>
            <Link to={`/top/${dest}/${x.slug}`} className="tp-main">
              <strong>{x.name}{x.verified && <BadgeCheck size={16} className="tp-ver" aria-label="Verified developer" />}{x.review_count > 0 && <span className="tp-chip-rev" title={`${x.review_count} buyer reviews`}>★ {Number(x.review_avg).toFixed(1)} ({x.review_count})</span>}{x.visited && <span className="tp-chip-visit" title="The RealHunt team visited this project"><Camera size={12} /> Visited</span>}</strong>
              <span className="tp-sub"><MapPin size={12} /> {x.locality} · {x.developer}</span>
              <span className="tp-facts"><b>from {eur(x.price_eur)}</b>{x.ppsqm_eur ? <span>{eur(x.ppsqm_eur)}/m²</span> : null}<span>{x.ptype}</span><span>{x.completion?.startsWith("Ready") ? "Ready" : x.completion ? `Ready ${x.completion}` : "Date not published"}</span>{x.sea_km != null && <span>{seaText(x.sea_km)}</span>}</span>
              <DimBars dims={x.dims} keys={miniKeys} mini />
            </Link>
            <div className="tp-act">
              <span className="tp-nota" title="Grade out of 100">{x.nota}<small>/100</small></span>
              <button className={"tp-vote" + (x.my_vote ? " is-on" : "")} aria-pressed={x.my_vote} onClick={() => vote(x, "vote")} aria-label={`Vote for ${x.name}`}><Heart size={16} /><span>{x.votes}</span></button>
              <button className={"tp-save" + (x.my_save ? " is-on" : "")} aria-pressed={x.my_save} onClick={() => vote(x, "save")} aria-label={`Save ${x.name}`}><Bookmark size={16} /></button>
            </div>
          </li>
        ))}</ol>
      )}
      <div className="tp-dev-cta">
        <Building2 size={20} />
        <div><strong>Developer in {D.name}? Is one of these your business?</strong><p>Verify it for free: you get the Verified badge, 100 in listing detail and the buyers' questions straight to you. Open your project and press "Verify it". Not in the list? List it free and it enters the ranking.</p></div>
        <Link className="hunt-primary" to="/network/start">List a project</Link>
      </div>
      <MoneyNote compact />
    </div>
  );
}

export function TopProjectPage() {
  const loc = useLocation();
  const [, , dest = "bali", slug = ""] = loc.pathname.split("/");
  const D = TOP_DESTS[dest] || TOP_DESTS.bali;
  const { user, requireUser, setNotice } = useCommunity();
  const [p, setP] = useState<any>(undefined);
  const [lb, setLb] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [f, setF] = useState({ name: "", budget: "", timeframe: "", message: "", pub: false });
  const [busy, setBusy] = useState(false);
  const load = () => rpc("top_project", { p_slug: slug }).then(setP).catch(() => setP(null));
  useEffect(() => { window.scrollTo(0, 0); load(); rpc("top_track", { p_slug: slug, p_kind: "view", p_anon: sid() }).catch(() => {}); ev("top_project_view"); }, [slug, user?.id]);
  useEffect(() => {
    if (!p) return;
    setMeta(`${p.name}, ${p.locality}: #${p.rank} of the ${D.name} ${TL(dest)} · RealHunt`, `${p.blurb} Ranked #${p.rank} of ${p.of} new builds in ${D.name} by RealHunt buyers.`, `https://realhunt.co/top/${dest}/${slug}`, `https://realhunt.co/top/${dest}/${slug}-og.jpg`);
  }, [p?.rank, p?.slug]);
  const track = (k: string) => rpc("top_track", { p_slug: slug, p_kind: k, p_anon: sid() }).catch(() => {});
  const toggle = async (k: "vote" | "save") => {
    if (!user) { setNotice(k === "vote" ? "Sign in to vote. One vote per person keeps the ranking fair." : "Sign in to save projects."); requireUser(); return; }
    try { const r = await rpc("top_toggle", { p_slug: slug, p_kind: k }); if (r?.error) setNotice(r.error); else { ev("top_" + k); if (r.on && k === "vote") setNotice("Vote counted. It moves this project up."); load(); } } catch (e) { setNotice((e as Error).message); }
  };
  const share = async () => {
    const url = `https://realhunt.co/top/${dest}/${slug}`; track("share"); ev("top_share");
    try { if ((navigator as any).share) await (navigator as any).share({ title: p.name, text: `#${p.rank} in the ${D.name} ${TL(dest)} on RealHunt`, url }); else { await navigator.clipboard.writeText(url); setNotice("Link copied."); } } catch { /* cancelled */ }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) { requireUser(); return; }
    setBusy(true);
    try { const r = await rpc("top_ask", { p_slug: slug, p_name: f.name, p_budget: f.budget ? Number(f.budget) : null, p_timeframe: f.timeframe, p_message: f.message, p_public: f.pub }); if (r?.error) setNotice(r.error); else { ev("top_ask"); setAsk(false); setNotice(p.verified ? "Sent to the developer. They answer you by email." : "Sent. RealHunt passes it to the developer and gets back to you by email."); load(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  if (p === undefined) return <div className="hunt-wrap hunt-page"><Loader2 className="animate-spin" /></div>;
  if (!p) return <div className="hunt-wrap hunt-page"><h1>Project not found</h1><Link to={`/top/${dest}`} className="hunt-link">Back to the {`${D.name} ${TL(dest)}`}</Link></div>;
  const imgs: string[] = p.images || [];
  const src = (p.sources || [])[0] || "";
  const srcHost = src ? new URL(src).hostname.replace(/^www\./, "") : "";
  const ready = p.completion?.startsWith("Ready");
  return (
    <div className="hunt-wrap hunt-page tp tp-detail">
      <Link to={`/top/${dest}`} className="hunt-link"><ChevronLeft size={15} /> {`${D.name} ${TL(dest)}`}</Link>
      <div className="tp-gallery">
        {imgs.slice(0, 5).map((s, i) => <button key={s} className={i === 0 ? "is-hero" : ""} onClick={() => setLb(i)} aria-label={`Open photo ${i + 1}`}><img src={s} alt={`${p.name}, photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} /></button>)}
        {imgs.length > 5 && <span className="tp-more">+{imgs.length - 5}</span>}
      </div>
      {lb !== null && <Lightbox images={imgs} start={lb} title={p.name} onClose={() => setLb(null)} />}
      <div className="tp-head">
        <div>
          <span className="tp-badge"><Trophy size={14} /> #{p.rank} of {p.of} in {D.name}</span>
          <span className="tp-badge is-grade">{p.nota}/100</span>
          {p.verified ? <span className="tp-badge is-ver"><BadgeCheck size={14} /> Verified developer</span> : <span className="tp-badge is-muted" title="The developer has not verified this page yet. Details come from the public listing.">Not verified yet</span>}
          <VisitBadge p={p} />
          <h1>{p.name}</h1>
          <p className="tp-sub"><MapPin size={14} /> {p.locality}, {D.name} · by {p.developer}</p>
        </div>
        <div className="tp-price"><small>from</small><b>{eur(p.price_eur)}</b>{p.ppsqm_eur ? <small>about {eur(p.ppsqm_eur)} per m²</small> : null}</div>
      </div>
      <div className="tp-actions">
        <button className={"tp-vote is-big" + (p.my_vote ? " is-on" : "")} aria-pressed={p.my_vote} onClick={() => toggle("vote")}><Heart size={17} /> {p.my_vote ? "Voted" : "Vote"} · {p.votes}</button>
        <button className={"tp-save is-big" + (p.my_save ? " is-on" : "")} aria-pressed={p.my_save} onClick={() => toggle("save")}><Bookmark size={17} /> {p.my_save ? "Saved" : "Save"}</button>
        <button className="hunt-primary" onClick={() => { if (!user) { requireUser(); return; } setAsk(!ask); }}><MessageCircle size={16} /> {p.my_ask ? "Ask again" : "Ask about this project"}</button>
        {p.verified && p.whatsapp && <a className="tp-web" href={`https://wa.me/${String(p.whatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I saw ${p.name} in the RealHunt ${D.name} ${TL(dest)}.`)}`} target="_blank" rel="noopener" onClick={() => { track("web"); ev("top_whatsapp"); }}><MessageCircle size={15} /> WhatsApp</a>}
        {p.website && <a className="tp-web" href={p.website} target="_blank" rel="noopener nofollow" onClick={() => { track("web"); ev("top_web"); }}><ExternalLink size={15} /> Developer website</a>}
        <button className="tp-web" onClick={share}><Share2 size={15} /> Share</button>
      </div>
      {ask && (
        <form className="hv-form tp-ask" onSubmit={send}>
          <strong>Ask {p.developer} about {p.name}</strong>
          <input required placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input type="number" min="0" placeholder="Budget in € (optional)" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} />
          <select value={f.timeframe} onChange={(e) => setF({ ...f, timeframe: e.target.value })}><option value="">When do you want to buy?</option><option>Now</option><option>In 3 months</option><option>In 6 months</option><option>In a year or more</option><option>Just looking</option></select>
          <textarea required placeholder="Your question: units left, payment plan, rental income, a video call…" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <label className="hv-consent"><input type="checkbox" checked={f.pub} onChange={(e) => setF({ ...f, pub: e.target.checked })} /> <span>Show my question and the developer's answer on this page, with my first name only. It helps other buyers.</span></label>
          <p className="hunt-fine">Your name, email and question go to this developer only, so they can answer you. We never sell your details.</p>
          <button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send question"}</button>
        </form>
      )}
      {!p.verified && (
        <div className="tp-claim-strip">
          <ShieldCheck size={20} />
          <div><strong>Is {p.name} your business?</strong><span>{p.my_claim === "pending" ? "We are checking your documents. It takes up to two working days." : p.my_claim === "rejected" ? "We could not verify it with the documents sent. You can try again." : "Verify it free: Verified badge, 100 in listing detail and buyers' questions straight to you."}</span></div>
          {p.my_claim !== "pending" && <Link className="hunt-primary" to={`/top/claim/${slug}`}>Verify it</Link>}
        </div>
      )}
      {p.mine && <p className="tp-claim-strip is-mine"><BadgeCheck size={18} /> This is your page. Edit the price, stage, website and WhatsApp and read buyers' questions in <Link to="/top/mine" className="hunt-link">your Top 100 panel</Link>.</p>}
      <p className="tp-blurb">{p.blurb}</p>
      {p.dev_note && <p className="tp-devnote"><b>From {p.developer}:</b> {p.dev_note}</p>}
      <dl className="tp-dl">
        <div><dt>Price from</dt><dd>{eur(p.price_eur)}</dd></div>
        {p.ppsqm_eur ? <div><dt>Price per m²</dt><dd>about {eur(p.ppsqm_eur)}</dd></div> : null}
        {p.size_min ? <div><dt>Smallest unit</dt><dd>{p.size_min} m²</dd></div> : null}
        <div><dt>Type</dt><dd>{p.ptype}</dd></div>
        <div><dt>Build stage</dt><dd>{ready ? "Ready to move in" : p.completion ? `Completion ${p.completion}` : "Not published"}</dd></div>
        <div><dt>Ownership</dt><dd>{p.ownership || "Ask the developer"}</dd></div>
        <div><dt>Area</dt><dd>{p.locality}</dd></div>
        <div><dt>Developer</dt><dd>{p.developer}</dd></div>
      </dl>
      {(p.layouts || []).length > 0 && (
        <table className="tp-units"><thead><tr><th>Unit size</th><th>Price from</th><th>Per m²</th></tr></thead>
          <tbody>{p.layouts.map((l: any, i: number) => <tr key={i}><td>{l.size} m²</td><td>{eur(l.price_eur)}</td><td>{eur(l.price_eur / l.size)}</td></tr>)}</tbody></table>
      )}
      <PriceVsArea p={p} dest={dest} />
      <VerifiedBox p={p} dest={dest} />
      <VisitBox p={p} />
      {p.dims && (
        <section className="tp-scores">
          <h2>{`Scores for ${p.name}`}</h2>
          <p className="hunt-fine">{`Each score goes from 0 to 100. Most compare it with the other projects in the ${D.name} ${TL(dest)}. Beach and Facilities use the same scale in every destination.`}</p>
          <DimBars dims={p.dims} />
          {p.sea_km != null && <p className="tp-sea"><MapPin size={14} /> {`${seaText(p.sea_km)} in a straight line, measured on the map.`}</p>}
          {(p.amen || []).length > 0 ? (
            <div className="tp-amen-list"><strong>Facilities listed</strong><ul>{AMEN.filter(([k]) => p.amen.includes(k)).map(([k, l]) => <li key={k}><Check size={13} /><span>{l}</span></li>)}</ul><small>From the developer's public listing. Ask the developer to confirm what is finished.</small></div>
          ) : <p className="hunt-fine">The listing does not show the facilities yet. Ask the developer.</p>}
        </section>
      )}
      <section className="tp-score">
        <h2>Why it is #{p.rank}</h2>
        <p className="tp-bignota"><b>{p.nota}</b>/100 <small>#{p.rank} of {p.of} in {D.name}</small></p>
        {p.dims && (() => { const ds = DIMS.filter(([k]) => p.dims?.[k] != null).sort((x, y) => p.dims[y[0]] - p.dims[x[0]]); return <p>{`The grade is the average of the 10 scores above. Strongest: ${ds.slice(0, 3).map(([, l]) => l).join(", ")}. Weakest: ${ds.slice(-2).reverse().map(([, l]) => l).join(", ")}.`}</p>; })()}
        <p className="hunt-fine">{p.votes} votes · {p.saves} saves · {p.asks} questions · {p.views} visitors.</p>
        <HowItWorks dest={dest} />
      </section>
      <ReviewsBox p={p} dest={dest} onChange={load} />
      <LegalBox p={p} dest={dest} />
      <QaList p={p} />
      {p.lat && p.lng && <p><a className="hunt-link" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener"><MapPin size={14} /> See it on Google Maps</a></p>}
      <div className="tp-dev-cta">
        <Building2 size={20} />
        <div><strong>{p.verified ? `${p.developer} is verified` : `Are you ${p.developer}?`}</strong><p>{p.verified ? "The developer showed RealHunt their company papers. Questions you send here go straight to them." : "Verify this page for free and get the buyers who ask about it. RealHunt only charges 5% if a buyer we send you buys."}</p></div>
        {!p.verified && <Link className="hunt-primary" to={`/top/claim/${slug}`}>Verify it</Link>}
      </div>
      {(p.near || []).length > 0 && (<>
        <h2>Next to it in the ranking</h2>
        <div className="tp-near">{p.near.map((n: any) => <Link key={n.slug} to={`/top/${dest}/${n.slug}`}><img src={n.image} alt={n.name} loading="lazy" /><b>#{n.rank} {n.name}{n.verified && <BadgeCheck size={13} className="tp-ver" />}</b><small>{n.locality} · from {eur(n.price_eur)}</small></Link>)}</div>
      </>)}
      <p className="hunt-fine tp-source">Details and photos: public listing{srcHost ? <> on <a href={src} target="_blank" rel="noopener nofollow">{srcHost}</a></> : null}, {D.date}. Photos belong to the developer. Prices and availability change; confirm them with the developer. RealHunt is not the seller.</p>
      <ReviewAndReport p={p} dest={dest} />
      <MoneyNote compact />
    </div>
  );
}


// ---------------------------------------------------------------- developer verification (/top/claim/:slug)
const BENEFITS: [string, string][] = [
  ["Verified badge", "Buyers see that RealHunt checked your company. It is the first thing buyers from abroad look for."],
  ["100 in listing detail", "Verified projects get the top listing detail score, which lifts their grade. The badge also shows on the list and on every share."],
  ["Buyers' questions go straight to you", "Name, email, budget and when they want to buy. No middleman, no cost per lead."],
  ["Your page, your numbers", "Update the price, build stage, website, WhatsApp and a note to buyers from your panel at realhunt.co/top/mine."],
  ["Bring your own buyers", "Share your page: every vote and save from your buyers moves you up. Buyers you cannot sell to can see other projects, and you earn 3% if they buy through RealHunt."],
  ["Free", "No fee to verify or to be listed. RealHunt only charges 5% if a buyer we send you buys."],
];
export function TopClaimPage() {
  const loc = useLocation();
  const slug = loc.pathname.split("/")[3] || "";
  const { user, requireUser, setNotice } = useCommunity();
  const [p, setP] = useState<any>(undefined);
  const [f, setF] = useState({ full_name: "", role: "", company: "", legal_name: "", reg_number: "", country: "", phone: "", website: "", message: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); rpc("top_project", { p_slug: slug }).then((x) => { setP(x); if (x) setF((v) => ({ ...v, company: v.company || x.developer || "", website: v.website || x.website || "", country: v.country || (TOP_DESTS[x.dest] || TOP_DESTS.bali).country })); }).catch(() => setP(null)); ev("top_claim_view"); }, [slug, user?.id]);
  useEffect(() => { if (p) document.title = `Verify ${p.name} · RealHunt Top 100`; }, [p?.slug]);
  const add = (list: FileList | null) => {
    const next = [...files];
    for (const x of Array.from(list || [])) { if (x.size > 10 * 1024 * 1024) { setNotice(`${x.name} is over 10 MB.`); continue; } if (next.length < 6) next.push(x); }
    setFiles(next);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { requireUser(); return; }
    if (!files.length) { setNotice("Add at least one document."); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser(); if (!u.user) throw new Error("Sign in first");
      const paths: string[] = [];
      for (const x of files) {
        const ext = (x.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
        const path = `${u.user.id}/${slug}/${Date.now()}-${paths.length}.${ext}`;
        const up = await supabase.storage.from("top-claims").upload(path, x, { contentType: x.type || undefined, upsert: false });
        if (up.error) throw up.error;
        paths.push(path);
      }
      const r = await rpc("top_claim_submit", { p_slug: slug, p_full_name: f.full_name, p_role: f.role, p_company: f.company, p_legal_name: f.legal_name, p_reg_number: f.reg_number, p_country: f.country, p_phone: f.phone, p_website: f.website, p_message: f.message, p_files: paths });
      if (r?.error) throw new Error(r.error);
      ev("top_claim_submit"); setDone(true);
    } catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  if (p === undefined) return <div className="hunt-wrap hunt-page"><Loader2 className="animate-spin" /></div>;
  if (!p) return <div className="hunt-wrap hunt-page"><h1>Project not found</h1><Link to="/top" className="hunt-link">All Top 100 rankings</Link></div>;
  const dest = p.dest || "bali"; const D = TOP_DESTS[dest] || TOP_DESTS.bali;
  return (
    <div className="hunt-wrap hunt-page tp tp-claim">
      <Link to={`/top/${dest}/${slug}`} className="hunt-link"><ChevronLeft size={15} /> {p.name}</Link>
      <span className="hunt-eyebrow"><ShieldCheck size={13} /> VERIFY YOUR BUSINESS</span>
      <h1>Is {p.name} yours? Verify it free.</h1>
      <p>{p.name} is <b>#{p.rank} of {p.of}</b> in the {`${D.name} ${TL(dest)}`} with a grade of <b>{p.nota}/100</b>{p.votes + p.saves + p.asks > 0 ? <>, and buyers are already voting, saving and asking about it</> : null}. Right now its page is built from public listings and buyers' questions come to RealHunt. Verify it and they come to you.</p>
      <ul className="tp-benefits">{BENEFITS.map(([t, d]) => <li key={t}><Check size={18} /><div><b>{t}</b><span>{d}</span></div></li>)}</ul>
      {p.verified ? <p className="tp-claim-strip"><BadgeCheck size={18} /> This page is already verified.</p> : done || p.my_claim === "pending" ? (
        <div className="tp-claim-strip is-done"><Check size={20} /><div><strong>Thanks, we have it.</strong><span>We check your documents within two working days. When it is approved you get the badge, and your page, its questions and the edit form appear in your Top 100 panel.</span></div><Link className="hunt-primary" to="/top/mine">Open my panel</Link></div>
      ) : !user ? (
        <div className="tp-claim-strip"><ShieldCheck size={20} /><div><strong>First, sign in or create your free account</strong><span>Use your work email. It becomes the login for your developer panel.</span></div><button className="hunt-primary" onClick={() => requireUser()}>Sign in</button></div>
      ) : (
        <form className="hv-form tp-claim-form" onSubmit={submit}>
          <strong>About you</strong>
          <input required placeholder="Your full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <input placeholder="Your role (owner, director, sales manager…)" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
          <input required placeholder="Phone or WhatsApp, with country code" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <strong>The company</strong>
          <input required placeholder="Brand name buyers know" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} />
          <input placeholder="Legal company name (for example PT …)" value={f.legal_name} onChange={(e) => setF({ ...f, legal_name: e.target.value })} />
          <input placeholder={`Registration number (${D.reg})`} value={f.reg_number} onChange={(e) => setF({ ...f, reg_number: e.target.value })} />
          <input placeholder="Country of the company" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} />
          <input required type="url" placeholder="Website of the company or project (https://…)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          <strong>Documents</strong>
          <p className="hunt-fine">1) The company registration ({D.reg}, deed or certificate). 2) One thing that links you to {p.name}: {D.permit}, a sales contract template or brochure with your company name, or a letter from the company saying you represent it. PDF or photo, up to 10 MB each. Only the RealHunt team sees them.</p>
          <label className="hunt-secondary tp-file">{<FileUp size={15} />} Add documents<input type="file" multiple accept="application/pdf,image/*" hidden onChange={(e) => { add(e.target.files); e.currentTarget.value = ""; }} /></label>
          {files.length > 0 && <ul className="tp-files">{files.map((x, i) => <li key={i}>{x.name}<button type="button" aria-label="Remove" onClick={() => setFiles(files.filter((_, k) => k !== i))}><X size={14} /></button></li>)}</ul>}
          <textarea placeholder="Anything we should know (optional): units left, what changed since the listing…" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <label className="hv-consent"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> <span>I work for or own this company and I am allowed to manage its listings. The documents are real.</span></label>
          <button className="hunt-primary" disabled={busy || !ok}>{busy ? "Sending…" : "Send for verification"}</button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the developer's own pages (/top/mine)
function Answer({ q, onSaved }: { q: any; onSaved: () => void }) {
  const { setNotice } = useCommunity();
  const [a, setA] = useState(q.answer || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { const r = await rpc("top_answer", { p_id: q.id, p_answer: a }); if (r?.error) setNotice(r.error); else { setNotice(q.is_public ? "Answer saved. It shows on your page, because the buyer allowed it." : "Answer saved. The buyer asked to keep it private, so it does not show on your page. Email them too."); ev("top_dev_answer"); onSaved(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="tp-answer">
      <small>{q.is_public ? "The buyer allowed this question to be public: your answer shows on your page with their first name." : "Private question: your answer is saved here but not shown on the page. Reply by email."}</small>
      <textarea maxLength={2000} placeholder="Your answer" value={a} onChange={(e) => setA(e.target.value)} />
      <button className="hunt-secondary" disabled={busy || a.trim().length < 2} onClick={save}>{busy ? "Saving…" : q.answer ? "Update answer" : "Save answer"}</button>
    </div>
  );
}
function MyPage({ pg, onSaved }: { pg: any; onSaved: () => void }) {
  const { setNotice } = useCommunity();
  const [e, setE] = useState({ price: String(pg.price_eur || ""), completion: pg.completion || "", website: pg.website || "", whatsapp: pg.whatsapp || "", note: pg.dev_note || "" });
  const [busy, setBusy] = useState(false);
  const save = async (ev_: React.FormEvent) => {
    ev_.preventDefault(); setBusy(true);
    try { const r = await rpc("top_dev_update", { p_slug: pg.slug, p_price_eur: e.price ? Number(e.price) : null, p_completion: e.completion, p_website: e.website, p_whatsapp: e.whatsapp, p_note: e.note }); if (r?.error) setNotice(r.error); else { setNotice("Saved. Your page shows it now."); ev("top_dev_update"); onSaved(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  const url = `https://realhunt.co/top/${pg.dest}/${pg.slug}`;
  return (
    <section className="tp-mine">
      <div className="tp-mine-head"><div><h2>{pg.name} <BadgeCheck size={17} className="tp-ver" /></h2><p className="tp-sub">#{pg.rank} in the {(TOP_DESTS[pg.dest] || TOP_DESTS.bali).name} {TL(pg.dest)} · grade {pg.nota}/100</p></div><Link className="hunt-link" to={`/top/${pg.dest}/${pg.slug}`}>See the page</Link></div>
      <div className="tp-dl"><div><dt>Visitors</dt><dd>{pg.views}</dd></div><div><dt>Votes</dt><dd>{pg.votes}</dd></div><div><dt>Saves</dt><dd>{pg.saves}</dd></div><div><dt>Questions</dt><dd>{pg.asks}</dd></div></div>
      <div className="tp-claim-strip"><Share2 size={18} /><div><strong>Bring your buyers, climb the ranking</strong><span>Send this link to your leads and followers. Every vote +3, every save +2, every question +4.</span></div><button className="hunt-primary" onClick={() => { navigator.clipboard.writeText(url); setNotice("Link copied."); ev("top_dev_copy"); }}>Copy link</button></div>
      <h3>Buyers' questions ({pg.questions.length})</h3>
      {pg.questions.length === 0 ? <p className="hunt-fine">None yet. Share your page to get the first ones.</p> : <ul className="tp-qs">{pg.questions.map((q: any) => <li key={q.id}><b>{q.name}</b> · <a href={`mailto:${q.email}?subject=${encodeURIComponent(pg.name + " – your question on RealHunt")}`}>{q.email}</a> · {q.budget_eur ? eur(q.budget_eur) : "no budget given"} · {q.timeframe || "no date"} · {new Date(q.at).toLocaleDateString("en-GB")}<p>{q.message}</p><Answer q={q} onSaved={onSaved} /></li>)}</ul>}
      <h3>Buyer reviews ({(pg.reviews || []).length})</h3>
      {(pg.reviews || []).length === 0 ? <p className="hunt-fine">No reviews yet. Reviews from buyers, good and bad, show on your page; you can reply to each one publicly.</p> : <ul className="tp-qs">{pg.reviews.map((r: any) => <li key={r.id}><b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> · {r.name || "A buyer"} · {new Date(r.at).toLocaleDateString("en-GB")}<p>{r.body}</p><ReviewReply r={r} onSaved={onSaved} /></li>)}</ul>}
      <form className="hv-form" onSubmit={save}>
        <strong>Edit your page</strong>
        <input type="number" min="5000" placeholder="Price from in €" value={e.price} onChange={(x) => setE({ ...e, price: x.target.value })} />
        <input placeholder="Build stage: Ready, or Q2 2027…" value={e.completion} onChange={(x) => setE({ ...e, completion: x.target.value })} />
        <input placeholder="Website (https://…)" value={e.website} onChange={(x) => setE({ ...e, website: x.target.value })} />
        <input placeholder="WhatsApp for buyers, with country code" value={e.whatsapp} onChange={(x) => setE({ ...e, whatsapp: x.target.value })} />
        <textarea maxLength={600} placeholder="A note to buyers: units left, payment plan, rental income…" value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} />
        <button className="hunt-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <p className="hunt-fine">To change photos or units, reply to our email with the files and we update them.</p>
      </form>
    </section>
  );
}
export function TopMinePage() {
  const { user, requireUser } = useCommunity();
  const [d, setD] = useState<any>(undefined);
  const load = () => rpc("top_my_pages").then(setD).catch(() => setD(null));
  useEffect(() => { document.title = "My Top 100 pages · RealHunt"; if (user) load(); else setD(null); }, [user?.id]);
  return (
    <div className="hunt-wrap hunt-page tp">
      <span className="hunt-eyebrow"><ShieldCheck size={13} /> DEVELOPERS</span>
      <h1>My Top 100 pages</h1>
      {!user ? <><p>Sign in with the account you used to verify your business.</p><button className="hunt-primary" onClick={() => requireUser()}>Sign in</button></> : d === undefined ? <Loader2 className="animate-spin" /> : (<>
        {(d?.pages || []).map((pg: any) => <MyPage key={pg.slug} pg={pg} onSaved={load} />)}
        {(d?.claims || []).filter((c: any) => c.status !== "approved").length > 0 && <><h2>Verification requests</h2><ul className="tp-qs">{d.claims.filter((c: any) => c.status !== "approved").map((c: any, i: number) => <li key={i}><Link to={`/top/${c.dest || "bali"}/${c.slug}`}><b>{c.project}</b></Link> · {c.status === "pending" ? "being checked (up to two working days)" : `not approved${c.reason ? `: ${c.reason}` : ""}`} · {new Date(c.at).toLocaleDateString("en-GB")}</li>)}</ul></>}
        {!(d?.pages || []).length && !(d?.claims || []).length && <p>No pages yet. Find your project in the <Link className="hunt-link" to="/top">Top 100 rankings</Link> and press "Verify it".</p>}
      </>)}
    </div>
  );
}

// ---------------------------------------------------------------- /top: every ranking
export function TopIndexPage() {
  const [tops, setTops] = useState<Record<string, any[]>>({});
  useEffect(() => {
    setMeta("Top 100 new builds by destination: Bali, Phuket, Tulum, Batumi, Koh Samui · RealHunt", "The 100 best new-build projects in Bali, Phuket, Tulum, Batumi and Koh Samui, ranked on price, area and build stage, then by what buyers vote, save and ask about.", "https://realhunt.co/top", "https://realhunt.co/top/bali/og.jpg");
    TOP_ORDER.forEach((k) => rpc("top_list", { p_dest: k }).then((r) => setTops((t) => ({ ...t, [k]: (r || []).slice(0, 3) }))).catch(() => {}));
  }, []);
  useEffect(() => { document.title = "Top 100 new builds by destination: Bali, Phuket, Tulum, Batumi, Koh Samui · RealHunt"; }, [tops]);
  return (
    <div className="hunt-wrap hunt-page tp">
      <span className="hunt-eyebrow"><Trophy size={14} /> {t("RealHunt rankings")}</span>
      <h1>{t("Top 100 new builds, by destination")}</h1>
      <p>{t("In each destination we checked every new-build project for sale and kept up to 100 of the best. Each one gets 10 scores from 0 to 100, and buyers' votes, saves and questions move it up. Nobody can pay to be listed or to rank higher.")} <Link className="hunt-link" to="/top/how-we-rank">{t("How we rank")}</Link></p>
      <div className="tp-index">{TOP_ORDER.map((k) => (
        <Link key={k} to={`/top/${k}`} className="tp-index-card">
          <img src={`/top/${k}/og.jpg`} alt={`${TL(k)} new builds in ${TOP_DESTS[k].name}`} loading="lazy" />
          <div><strong>{TOP_DESTS[k].name}, {TOP_DESTS[k].country}</strong><small>{`Best ${TOP_DESTS[k].n || 100} of ${TOP_DESTS[k].checked} projects`}</small>
            <ol>{(tops[k] || []).map((x) => <li key={x.slug}>#{x.rank} {x.name} <em>from {eur(x.price_eur)}</em></li>)}</ol></div>
        </Link>
      ))}</div>
    </div>
  );
}
