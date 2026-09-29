// RealHunt Top 100 (30-sep-2026): the best new-build projects of a destination, starting with Bali.
// Lives on its own pages (/top/bali and /top/bali/:slug), never in the main feed.
// Order = a base score (price, price per m², area, build stage, how complete the listing is, developer track record)
// plus buyer demand (votes, saves, questions, website clicks, views), so the list moves with what people choose.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sid } from "@/lib/rh";
import { useCommunity } from "./ctx";
import { Lightbox } from "./extras";
import { ArrowDown, ArrowUp, Bookmark, Building2, ChevronLeft, ExternalLink, Heart, Loader2, MapPin, MessageCircle, Share2, Trophy } from "lucide-react";

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

export const TOP_DESTS: Record<string, { name: string; checked: number; date: string }> = {
  bali: { name: "Bali", checked: 502, date: "29 September 2026" },
};
const AREAS: [string, RegExp][] = [["Canggu", /canggu|pererenan|berawa|umalas|kerobokan|seminyak|north kuta|seseh|cemagi|nyanyi|kedungu|tabanan|beraban/i], ["Uluwatu & Bukit", /uluwatu|ungasan|pecatu|bingin|melasti|balangan|pandawa|kutuh|nyang/i], ["Ubud", /ubud|sayan|tegallalang|kedewatan|gianyar/i], ["Nusa Dua & Jimbaran", /nusa dua|benoa|jimbaran|kampial|sawangan/i], ["Sanur & Denpasar", /sanur|denpasar/i]];
const areaOf = (loc?: string) => AREAS.find(([, re]) => re.test(loc || ""))?.[0] || "Other";
const PARTS: [string, string, number][] = [["entry", "Entry price", 20], ["value", "Price per m²", 25], ["location", "Area", 20], ["stage", "Build stage", 15], ["info", "Listing detail", 10], ["developer", "Developer track record", 10]];

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
      <p>We checked {D.checked} new-build projects listed for sale in {D.name} and kept the 100 with the best base score. Then buyers decide: every vote, save and question moves a project up.</p>
      <div className="tp-how-grid">
        <div><strong>Base score (up to 100)</strong><ul>{PARTS.map(([, l, m]) => <li key={l}>{l}: up to {m}</li>)}</ul><small>Cheaper entry price and a lower price per m² score more. Areas near the busiest beaches and towns score more. Ready homes score more than homes still on plans.</small></div>
        <div><strong>Buyer demand (no limit)</strong><ul><li>Vote: +3</li><li>Save: +2</li><li>Question to the developer: +4</li><li>Click to the developer's website or share: +1</li><li>Every 20 visitors: +1</li></ul><small>One vote and one save per person. Nobody can pay to move up. Developers can claim their page for free.</small></div>
      </div>
      <p className="hunt-fine">Prices, sizes and dates come from the public listings on {D.date}. They change, so check with the developer before you decide. This is a ranking, not advice to buy.</p>
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
  const [sort, setSort] = useState("rank");
  const load = () => rpc("top_list", { p_dest: dest }).then((r) => setRows(r || [])).catch(() => setRows([]));
  useEffect(() => {
    if (!D) return;
    setMeta(`Top 100 new builds in ${D.name}, ranked by buyers · RealHunt`, `The 100 best new-build villas and apartments in ${D.name}, from ${D.checked} projects checked. Ranked by price, area and build stage, then by what buyers vote, save and ask about.`, `https://realhunt.co/top/${dest}`, `https://realhunt.co/top/${dest}/og.jpg`);
    load(); ev("top_list_view");
  }, [dest, user?.id]);
  useEffect(() => { if (D && rows) document.title = `Top 100 new builds in ${D.name}, ranked by buyers · RealHunt`; }, [rows]);
  const list = useMemo(() => {
    let r = (rows || []).filter((x) => (area === "All" || areaOf(x.locality) === area) && (kind === "All" || (kind === "Under €100k" ? x.price_eur <= 100000 : x.ptype === kind)));
    if (sort === "price") r = [...r].sort((a, b) => a.price_eur - b.price_eur);
    if (sort === "votes") r = [...r].sort((a, b) => b.votes - a.votes || a.rank - b.rank);
    return r;
  }, [rows, area, kind, sort]);
  const vote = async (x: any, k: "vote" | "save") => {
    if (!user) { setNotice(k === "vote" ? "Sign in to vote. One vote per person keeps the ranking fair." : "Sign in to save projects."); requireUser(); return; }
    try { const r = await rpc("top_toggle", { p_slug: x.slug, p_kind: k }); if (r?.error) setNotice(r.error); else { ev("top_" + k); load(); } } catch (e) { setNotice((e as Error).message); }
  };
  if (!D) return <div className="hunt-wrap hunt-page"><h1>Ranking not found</h1><Link to="/top/bali" className="hunt-link">See the Bali Top 100</Link></div>;
  return (
    <div className="hunt-wrap hunt-page tp">
      <span className="hunt-eyebrow"><Trophy size={13} /> REALHUNT RANKINGS</span>
      <h1>Top 100 new builds in {D.name}</h1>
      <p>The ranking is made by demand. We picked the 100 best of {D.checked} projects on price, price per m², area and build stage. From there, the projects buyers vote for, save and ask about climb.</p>
      <HowItWorks dest={dest} />
      <div className="tp-filters">
        <div className="tp-chips">{["All", ...AREAS.map((a) => a[0]), "Other"].map((a) => <button key={a} aria-pressed={area === a} onClick={() => setArea(a)}>{a}</button>)}</div>
        <div className="tp-chips">{["All", "Under €100k", "Villas", "Apartments", "Townhouses"].map((a) => <button key={a} aria-pressed={kind === a} onClick={() => setKind(a)}>{a}</button>)}
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="rank">Rank</option><option value="price">Lowest price</option><option value="votes">Most votes</option></select></div>
      </div>
      {rows === null ? <Loader2 className="animate-spin" /> : list.length === 0 ? <p>No projects match. Try another filter.</p> : (
        <ol className="tp-list">{list.map((x) => (
          <li key={x.slug} className="tp-row">
            <div className="tp-rank"><b>#{x.rank}</b><Move rank={x.rank} base={x.base_rank} /></div>
            <Link to={`/top/${dest}/${x.slug}`} className="tp-thumb"><img src={x.image} alt={x.name} loading={x.rank <= 6 ? "eager" : "lazy"} /></Link>
            <Link to={`/top/${dest}/${x.slug}`} className="tp-main">
              <strong>{x.name}</strong>
              <span className="tp-sub"><MapPin size={12} /> {x.locality} · {x.developer}</span>
              <span className="tp-facts"><b>from {eur(x.price_eur)}</b>{x.ppsqm_eur ? <span>{eur(x.ppsqm_eur)}/m²</span> : null}<span>{x.ptype}</span><span>{x.completion?.startsWith("Ready") ? "Ready" : x.completion ? `Ready ${x.completion}` : "Date not published"}</span></span>
            </Link>
            <div className="tp-act">
              <button className={"tp-vote" + (x.my_vote ? " is-on" : "")} aria-pressed={x.my_vote} onClick={() => vote(x, "vote")} aria-label={`Vote for ${x.name}`}><Heart size={16} /><span>{x.votes}</span></button>
              <button className={"tp-save" + (x.my_save ? " is-on" : "")} aria-pressed={x.my_save} onClick={() => vote(x, "save")} aria-label={`Save ${x.name}`}><Bookmark size={16} /></button>
            </div>
          </li>
        ))}</ol>
      )}
      <div className="tp-dev-cta">
        <Building2 size={20} />
        <div><strong>Developer in {D.name}?</strong><p>If your project is here, claim its page for free: add your photos, prices and units, and answer the buyers who ask. If it is missing, list it free and it enters the ranking.</p></div>
        <Link className="hunt-primary" to="/network/start">Claim or add a project</Link>
      </div>
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
  const [f, setF] = useState({ name: "", budget: "", timeframe: "", message: "" });
  const [busy, setBusy] = useState(false);
  const load = () => rpc("top_project", { p_slug: slug }).then(setP).catch(() => setP(null));
  useEffect(() => { window.scrollTo(0, 0); load(); rpc("top_track", { p_slug: slug, p_kind: "view", p_anon: sid() }).catch(() => {}); ev("top_project_view"); }, [slug, user?.id]);
  useEffect(() => {
    if (!p) return;
    setMeta(`${p.name}, ${p.locality}: #${p.rank} of the ${D.name} Top 100 · RealHunt`, `${p.blurb} Ranked #${p.rank} of ${p.of} new builds in ${D.name} by RealHunt buyers.`, `https://realhunt.co/top/${dest}/${slug}`, `https://realhunt.co/top/${dest}/${slug}-og.jpg`);
  }, [p?.rank, p?.slug]);
  const track = (k: string) => rpc("top_track", { p_slug: slug, p_kind: k, p_anon: sid() }).catch(() => {});
  const toggle = async (k: "vote" | "save") => {
    if (!user) { setNotice(k === "vote" ? "Sign in to vote. One vote per person keeps the ranking fair." : "Sign in to save projects."); requireUser(); return; }
    try { const r = await rpc("top_toggle", { p_slug: slug, p_kind: k }); if (r?.error) setNotice(r.error); else { ev("top_" + k); if (r.on && k === "vote") setNotice("Vote counted. It moves this project up."); load(); } } catch (e) { setNotice((e as Error).message); }
  };
  const share = async () => {
    const url = `https://realhunt.co/top/${dest}/${slug}`; track("share"); ev("top_share");
    try { if ((navigator as any).share) await (navigator as any).share({ title: p.name, text: `#${p.rank} in the ${D.name} Top 100 on RealHunt`, url }); else { await navigator.clipboard.writeText(url); setNotice("Link copied."); } } catch { /* cancelled */ }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) { requireUser(); return; }
    setBusy(true);
    try { const r = await rpc("top_ask", { p_slug: slug, p_name: f.name, p_budget: f.budget ? Number(f.budget) : null, p_timeframe: f.timeframe, p_message: f.message }); if (r?.error) setNotice(r.error); else { ev("top_ask"); setAsk(false); setNotice("Sent. RealHunt passes your question to the developer and gets back to you by email."); load(); } }
    catch (err) { setNotice((err as Error).message); } finally { setBusy(false); }
  };
  if (p === undefined) return <div className="hunt-wrap hunt-page"><Loader2 className="animate-spin" /></div>;
  if (!p) return <div className="hunt-wrap hunt-page"><h1>Project not found</h1><Link to={`/top/${dest}`} className="hunt-link">Back to the {D.name} Top 100</Link></div>;
  const imgs: string[] = p.images || [];
  const src = (p.sources || [])[0] || "";
  const srcHost = src ? new URL(src).hostname.replace(/^www\./, "") : "";
  const demand = Math.max(0, Math.round((Number(p.score) - Number(p.base_score)) * 10) / 10);
  const ready = p.completion?.startsWith("Ready");
  return (
    <div className="hunt-wrap hunt-page tp tp-detail">
      <Link to={`/top/${dest}`} className="hunt-link"><ChevronLeft size={15} /> {D.name} Top 100</Link>
      <div className="tp-gallery">
        {imgs.slice(0, 5).map((s, i) => <button key={s} className={i === 0 ? "is-hero" : ""} onClick={() => setLb(i)} aria-label={`Open photo ${i + 1}`}><img src={s} alt={`${p.name}, photo ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} /></button>)}
        {imgs.length > 5 && <span className="tp-more">+{imgs.length - 5}</span>}
      </div>
      {lb !== null && <Lightbox images={imgs} start={lb} title={p.name} onClose={() => setLb(null)} />}
      <div className="tp-head">
        <div>
          <span className="tp-badge"><Trophy size={14} /> #{p.rank} of {p.of} in {D.name}</span>
          {p.status === "unclaimed" && <span className="tp-badge is-muted" title="The developer has not claimed this page yet. Details come from the public listing.">Unclaimed</span>}
          <h1>{p.name}</h1>
          <p className="tp-sub"><MapPin size={14} /> {p.locality}, {D.name} · by {p.developer}</p>
        </div>
        <div className="tp-price"><small>from</small><b>{eur(p.price_eur)}</b>{p.ppsqm_eur ? <small>about {eur(p.ppsqm_eur)} per m²</small> : null}</div>
      </div>
      <div className="tp-actions">
        <button className={"tp-vote is-big" + (p.my_vote ? " is-on" : "")} aria-pressed={p.my_vote} onClick={() => toggle("vote")}><Heart size={17} /> {p.my_vote ? "Voted" : "Vote"} · {p.votes}</button>
        <button className={"tp-save is-big" + (p.my_save ? " is-on" : "")} aria-pressed={p.my_save} onClick={() => toggle("save")}><Bookmark size={17} /> {p.my_save ? "Saved" : "Save"}</button>
        <button className="hunt-primary" onClick={() => { if (!user) { requireUser(); return; } setAsk(!ask); }}><MessageCircle size={16} /> {p.my_ask ? "Ask again" : "Ask about this project"}</button>
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
          <p className="hunt-fine">RealHunt sends your question and name to the developer and gets back to you by email. We never sell your details.</p>
          <button className="hunt-primary" disabled={busy}>{busy ? "Sending…" : "Send question"}</button>
        </form>
      )}
      <p className="tp-blurb">{p.blurb}</p>
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
      <section className="tp-score">
        <h2>Why it is #{p.rank}</h2>
        <p className="hunt-fine">Score {p.score}: base {p.base_score} + buyer demand {demand}.</p>
        {PARTS.map(([k, l, m]) => <div key={k} className="tp-bar"><span>{l}</span><i><b style={{ width: `${Math.min(100, ((p.parts?.[k] || 0) / m) * 100)}%` }} /></i><em>{p.parts?.[k] ?? 0}/{m}</em></div>)}
        <div className="tp-bar is-demand"><span>Buyer demand</span><i><b style={{ width: `${Math.min(100, demand * 3)}%` }} /></i><em>+{demand}</em></div>
        <p className="hunt-fine">{p.votes} votes · {p.saves} saves · {p.asks} questions · {p.views} visitors.</p>
        <HowItWorks dest={dest} />
      </section>
      {p.lat && p.lng && <p><a className="hunt-link" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener"><MapPin size={14} /> See it on Google Maps</a></p>}
      <div className="tp-dev-cta">
        <Building2 size={20} />
        <div><strong>Are you {p.developer}?</strong><p>Claim this page for free. Add real photos, units and your payment plan, and answer buyers directly. RealHunt only charges 5% if a buyer we send you buys.</p></div>
        <Link className="hunt-primary" to={`/network/start?top=${encodeURIComponent(slug)}`}>Claim this page</Link>
      </div>
      {(p.near || []).length > 0 && (<>
        <h2>Next to it in the ranking</h2>
        <div className="tp-near">{p.near.map((n: any) => <Link key={n.slug} to={`/top/${dest}/${n.slug}`}><img src={n.image} alt={n.name} loading="lazy" /><b>#{n.rank} {n.name}</b><small>{n.locality} · from {eur(n.price_eur)}</small></Link>)}</div>
      </>)}
      <p className="hunt-fine tp-source">Details and photos: public listing{srcHost ? <> on <a href={src} target="_blank" rel="noopener nofollow">{srcHost}</a></> : null}, {D.date}. Photos belong to the developer. Prices and availability change; confirm them with the developer. RealHunt is not the seller.</p>
    </div>
  );
}
