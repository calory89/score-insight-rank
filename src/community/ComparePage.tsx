// /compare?ids=slug1,slug2,... (8-nov-2026): 2-4 homes side by side. Loaded lazily from Community.tsx.
//  - sticky header with photo, price and title; rows grouped: price & costs, home, location, checks
//  - the best value of each row is highlighted (green tint plus a "Best" label, never colour alone)
//  - phones: the table scrolls sideways with snap points, the first column stays put
//  - add a home by search, share the link, print it (print styles in compare.css)
// Facts come from the public snapshot (/data/rh-static.json) and src/community/checkLogic.ts.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Calculator, Check, Download, Plus, Printer, Scale, Search, Share2, Trash2, X } from "lucide-react";
import { loadRows } from "./compareTools";
import { thumb, onThumbError } from "@/lib/thumbs";
import { money } from "./api";
import { t } from "./i18n";
import { tr } from "@/lib/lang";
import { useCommunity } from "./ctx";
import { useBuyerGroup } from "./check";
import { GROUPS, type Group } from "./checkLogic";
import { DIMS } from "./dims";
import { guestSaves } from "./guestSaves";
import { usePreference } from "./buyer-state";
import { COMPARE_KEY, MAX_COMPARE, bestIndexes, compareHref, facts, parseIds, type Better, type CompareRow, type Facts, type Place } from "./compareLogic";
import { areaMedian, download, toCsv, vsMedian } from "./compareSavedUi";
import "./compare.css";

type F = Facts & { area: { scope: string; median: number; n: number } | null; vsArea: number | null };
type Line = { k: string; label: string; help?: string; show: (f: F, d: CompareRow) => ReactNode; v?: (f: F) => number | null; better?: Better; when?: (fs: F[]) => boolean };
const NA = () => <span className="rh-cmp-na">{t("Not stated")}</span>;
const kmText = (p: Place) => (p ? (p.km < 1 ? t("under 1 km") : `${p.km < 10 ? Math.round(p.km * 10) / 10 : Math.round(p.km)} km`) : null);
const place = (p: Place, withName = true) => (p ? <>{kmText(p)}{withName && p.name ? <small>{p.name}</small> : null}</> : <NA />);
const pctText = (p: [number, number] | null) => (p ? (p[0] === p[1] ? `${p[0]}%` : `${p[0]}–${p[1]}%`) : null);
const nice = (v: number) => (v >= 100000 ? Math.round(v / 1000) * 1000 : v >= 1000 ? Math.round(v / 100) * 100 : Math.round(v));
const LIGHT: Record<string, string> = { green: "Yes", amber: "With conditions", red: "Restricted" };

const GROUPS_OF_ROWS: { title: string; lines: Line[] }[] = [
  { title: "Price & costs", lines: [
    { k: "price", label: "Price", show: (f) => (f.price ? <strong>{money(f.price)}</strong> : <NA />), v: (f) => f.price, better: "min" },
    { k: "perSqm", label: "Price per m²", show: (f) => (f.perSqm ? `${money(f.perSqm)}/m²` : <NA />), v: (f) => f.perSqm, better: "min" },
    { k: "vsArea", label: "Price per m² against the area", help: "Against the median of the homes on RealHunt in the same region, or the country when the region has fewer than five", show: (f) => (f.area && f.vsArea != null ? <>{f.vsArea === 0 ? t("Same as the median") : <>{`${f.vsArea < 0 ? "−" : "+"}${Math.abs(f.vsArea)}%`} {t(f.vsArea < 0 ? "below the median" : "above the median")}</>}<small>{money(f.area.median)}/m² · {f.area.scope} · {f.area.n} {t("homes")}</small></> : <NA />), v: (f) => f.vsArea, better: "min", when: (fs) => fs.some((f) => f.vsArea != null) },
    { k: "allIn", label: "All-in to buy", help: "Price plus typical taxes and fees to buy in that country", show: (f) => (f.allInLow ? <>≈ {money(nice(f.allInLow))}{f.allInHigh && Math.round(f.allInHigh) !== Math.round(f.allInLow) ? <small>{t("up to")} {money(nice(f.allInHigh))}</small> : null}</> : <NA />), v: (f) => f.allInLow, better: "min" },
    { k: "monthly", label: "Monthly costs", help: "Community fee (HOA) plus property tax, when the listing states them", show: (f) => (f.monthly ? <>≈ {money(Math.round(f.monthly))}<small>{t("a month")}</small></> : <NA />), v: (f) => f.monthly, better: "min" },
    { k: "pct", label: "Buying costs", help: "Taxes, notary and registry as a share of the price", show: (f) => pctText(f.costPct) || <NA />, v: (f) => (f.costPct ? f.costPct[0] : null), better: "min" },
  ] },
  { title: "Home", lines: [
    { k: "sqm", label: "Floor area", show: (f) => (f.sqm ? `${f.sqm} m²` : <NA />), v: (f) => f.sqm, better: "max" },
    { k: "beds", label: "Bedrooms", show: (f) => (f.beds == null ? <NA /> : f.beds === 0 ? t("Studio") : String(f.beds)), v: (f) => f.beds, better: "max" },
    { k: "score", label: "RealHunt score", help: "70 to 98, compared with every other home on RealHunt", show: (f) => (f.score != null ? <strong>{f.score}</strong> : <NA />), v: (f) => f.score, better: "max" },
    { k: "year", label: "Year built", show: (f) => (f.year ? String(f.year) : <NA />), v: (f) => f.year, better: "max", when: (fs) => fs.some((f) => f.year) },
  ] },
  { title: "Location", lines: [
    { k: "where", label: "Where", show: (_f, d) => <>{d.location_name || d.country || <NA />}{d.location_name && d.country && !String(d.location_name).includes(d.country) ? <small>{d.country}</small> : null}</> },
    { k: "sea", label: "Sea", show: (f) => place(f.sea), v: (f) => f.sea?.km ?? null, better: "min", when: (fs) => fs.some((f) => f.sea) },
    { k: "lake", label: "Lake", show: (f) => place(f.lake), v: (f) => f.lake?.km ?? null, better: "min", when: (fs) => fs.some((f) => f.lake) },
    { k: "airport", label: "Airport", show: (f) => place(f.airport), v: (f) => f.airport?.km ?? null, better: "min" },
    { k: "shop", label: "Shop", show: (f) => place(f.shop), v: (f) => f.shop?.km ?? null, better: "min", when: (fs) => fs.some((f) => f.shop) },
    { k: "train", label: "Train station", show: (f) => place(f.train), v: (f) => f.train?.km ?? null, better: "min", when: (fs) => fs.some((f) => f.train) },
    { k: "hospital", label: "Hospital", show: (f) => place(f.hospital), v: (f) => f.hospital?.km ?? null, better: "min", when: (fs) => fs.some((f) => f.hospital) },
  ] },
  { title: "Checks", lines: [
    { k: "buy", label: "Can I buy here?", show: (f) => (f.rule ? <span className={"rh-cmp-light is-" + f.rule.s} title={f.rule.note}>{t(LIGHT[f.rule.s])}</span> : <NA />), v: (f) => f.ruleRank, better: "max" },
    { k: "flags", label: "Things to check", help: "Risk words found in the listing text, such as auction, flood zone or tenant in place", show: (f) => (f.flags.length ? <ul className="rh-cmp-flags">{f.flags.slice(0, 4).map((x) => <li key={x.id}>{t(x.label)}</li>)}</ul> : <span className="rh-cmp-ok">{t("None found")}</span>), v: (f) => f.flagCount, better: "min" },
  ] },
];

function useSnapshotRows() {
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let on = true; loadRows().then((r) => { if (on) setRows(r as CompareRow[]); }).catch(() => { if (on) { setFailed(true); setRows([]); } }); return () => { on = false; }; }, []);
  return { rows, failed };
}

export default function ComparePage() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { setNotice } = useCommunity();
  const [stored, setStored] = usePreference<string[]>(COMPARE_KEY, []);
  const fromUrl = parseIds(new URLSearchParams(loc.search).get("ids"));
  const ids = fromUrl.length ? fromUrl : parseIds((stored || []).join(","));
  const key = ids.join(",");
  const { rows, failed } = useSnapshotRows();
  const [group, setGroup] = useBuyerGroup();
  const [showDims, setShowDims] = useState(false);
  const [adding, setAdding] = useState(false);

  // The URL is the source of truth; keep this device's selection (the tray) in step with it.
  useEffect(() => {
    if (!fromUrl.length && ids.length) navigate(compareHref(ids), { replace: true });
    if (key !== (stored || []).join(",")) setStored(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { document.title = t("Compare homes side by side") + " · RealHunt"; }, []);
  // list 854: a comparison link is for people, not for search engines (every mix of homes would be a page)
  useEffect(() => {
    let m = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null; const before = m?.content ?? null;
    if (!m) { m = document.createElement("meta"); m.name = "robots"; document.head.appendChild(m); }
    m.content = "noindex, follow";
    return () => { if (m) { if (before == null) m.remove(); else m.content = before; } };
  }, []);

  const homes = useMemo(() => (rows ? ids.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as CompareRow[] : []), [rows, key]);
  const fs = useMemo(() => homes.map((h) => { const f = facts(h, group as Group); const area = rows ? areaMedian(h, rows) : null; return { ...f, area, vsArea: area ? vsMedian(f.perSqm, area.median) : null }; }), [homes, group, rows]);
  const missing = rows ? ids.filter((s) => !rows.some((r) => r.slug === s)) : [];
  const setIds = (next: string[]) => { setStored(next); navigate(next.length ? compareHref(next) : "/compare", { replace: true }); };
  const remove = (slug: string) => setIds(ids.filter((s) => s !== slug));
  const add = (slug: string) => { if (ids.includes(slug) || ids.length >= MAX_COMPARE) return; setIds([...ids, slug]); setAdding(false); };

  // list 887: the two first homes in the "compare the total cost of two homes" calculator, prices filled in
  const calcHref = homes.length >= 2 && homes[0].price_eur && homes[1].price_eur && homes[0].country && homes[1].country
    ? `/tools/compare-buying-costs?a=${encodeURIComponent(String(homes[0].country).toLowerCase().replace(/\s+/g, "-"))}&pa=${Math.round(homes[0].price_eur)}&b=${encodeURIComponent(String(homes[1].country).toLowerCase().replace(/\s+/g, "-"))}&pb=${Math.round(homes[1].price_eur)}`
    : null;
  // list 895: every row of the table, as text, one column per home
  function csv() {
    const all = [...lines.flatMap((g) => g.lines), ...(hasDims ? dimLines : [])];
    const text = (node: ReactNode): string => typeof node === "string" || typeof node === "number" ? String(node) : Array.isArray(node) ? node.map(text).join(" ") : node && typeof node === "object" && "props" in (node as any) ? text((node as any).props.children) : "";
    const head = ["", ...homes.map((h) => String(h.title || h.slug).trim())];
    const body: unknown[][] = [["URL", ...homes.map((h) => `${location.origin}/deal/${encodeURIComponent(h.slug)}`)]];
    for (const l of all) body.push([tr(l.label), ...homes.map((h, i) => { const v = text(l.show(fs[i], h)).replace(/\s+/g, " ").trim(); return v ? tr(v) : tr("Not stated"); })]);
    download("realhunt-compare.csv", toCsv(head, body));
    try { (window as any).clarity?.("event", "compare_csv"); } catch { /* blocked */ }
  }
  async function share() {
    const url = location.origin + compareHref(ids);
    try {
      if (navigator.share) { await navigator.share({ title: t("Compare homes side by side"), url }); return; }
      await navigator.clipboard.writeText(url); setNotice(t("Link copied."));
    } catch { /* cancelled */ }
  }

  // Header and body scroll sideways together (the header is outside the scroller so it can stick to the page).
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const sync = (from: HTMLDivElement | null, to: HTMLDivElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true; to.scrollLeft = from.scrollLeft; requestAnimationFrame(() => { syncing.current = false; });
  };
  const [top, setTop] = useState(0);
  useEffect(() => {
    const h = document.querySelector(".hunt-header") as HTMLElement | null;
    const pos = h ? getComputedStyle(h).position : "";
    setTop(h && (pos === "sticky" || pos === "fixed") ? h.getBoundingClientRect().height : 0);
  }, []);

  const n = homes.length;
  const style = { "--n": String(Math.max(n, 1)), "--top": top + "px" } as CSSProperties;
  const lines = GROUPS_OF_ROWS.map((g) => ({ ...g, lines: g.lines.filter((l) => !l.when || l.when(fs)) }));
  const dimLines: Line[] = DIMS.map(([k, label, help]) => ({ k: "dim-" + k, label, help, show: (f) => (f.dims?.[k] != null ? <span className="rh-cmp-bar"><span className="rh-cmp-track" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, f.dims[k]))}%` }} /></span>{f.dims[k]}</span> : <NA />), v: (f) => (f.dims?.[k] != null ? f.dims[k] : null), better: "max" as Better }));
  const hasDims = fs.some((f) => Object.keys(f.dims || {}).length > 0);

  const renderLine = (l: Line) => {
    const best = l.v && l.better ? bestIndexes(fs.map(l.v), l.better) : [];
    return (
      <div className="rh-cmp-row" role="row" key={l.k}>
        <div className="rh-cmp-lab" role="rowheader"><span>{t(l.label)}</span>{l.help && <small>{t(l.help)}</small>}</div>
        {homes.map((h, i) => (
          <div key={h.slug} role="cell" className={"rh-cmp-c" + (best.includes(i) ? " is-best" : "")}>
            <span className="rh-cmp-v">{l.show(fs[i], h)}</span>
            {best.includes(i) && <span className="rh-cmp-best"><Check size={12} aria-hidden="true" />{t("Best")}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="hunt-wrap rh-cmp" style={style}>
      <div className="rh-cmp-intro">
        <span className="hunt-eyebrow"><Scale size={13} aria-hidden="true" /> {t("Compare")}</span>
        <h1>{t("Compare homes side by side")}</h1>
        <p>{t("Up to four homes. The best value in each row is marked. Missing information is shown as not stated, never guessed.")}</p>
        <div className="rh-cmp-tools">
          <label className="rh-cmp-group"><span>{t("Buying as")}</span>
            <select value={group} onChange={(e) => setGroup(e.target.value as Group)}>{GROUPS.map(([g, l]) => <option key={g} value={g}>{t(l)}</option>)}</select>
          </label>
          {n > 0 && <button type="button" className="hunt-secondary" onClick={share}><Share2 size={16} aria-hidden="true" /> {t("Share link")}</button>}
          {n > 0 && <button type="button" className="hunt-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> {t("Print")}</button>}
          {n > 0 && <button type="button" className="hunt-secondary" onClick={csv}><Download size={16} aria-hidden="true" /> {t("Download CSV")}</button>}
          {n >= 2 && calcHref && <Link className="hunt-secondary" to={calcHref}><Calculator size={16} aria-hidden="true" /> {t("Buying costs calculator")}</Link>}
          {ids.length > 0 && <button type="button" className="hunt-link rh-cmp-clear" onClick={() => setIds([])}><Trash2 size={15} aria-hidden="true" /> {t("Clear all")}</button>}
          {ids.length < MAX_COMPARE && <button type="button" className="hunt-primary" aria-expanded={adding} onClick={() => setAdding((v) => !v)}><Plus size={16} aria-hidden="true" /> {t("Add home")}</button>}
        </div>
        {adding && rows && <AddHome rows={rows} ids={ids} onAdd={add} onClose={() => setAdding(false)} />}
      </div>

      {!rows ? <div className="rh-cmp-skel" aria-busy="true" aria-label={t("Loading…")}><i /><i /><i /></div> : failed ? (
        <p role="alert" className="hunt-error-text">{t("We could not load the homes. Check your connection and try again.")}</p>
      ) : n === 0 ? (
        <div className="rh-cmp-empty">
          <h2>{t("Pick two or more homes")}</h2>
          <p>{t("Tap Compare on any home, or add one here with the search.")}</p>
          <p className="hunt-row"><button type="button" className="hunt-primary" onClick={() => setAdding(true)}><Search size={16} aria-hidden="true" /> {t("Add home")}</button> <Link className="hunt-secondary" to="/">{t("See the best homes")}</Link></p>
        </div>
      ) : (
        <>
          {missing.length > 0 && <p className="rh-cmp-note" role="status">{t("Some homes in this link are no longer listed.")}</p>}
          {n === 1 && <p className="rh-cmp-note" role="status">{t("Add one more home to compare.")}</p>}
          <div className="rh-cmp-table" role="table" aria-label={t("Compare homes side by side")}>
            <div className="rh-cmp-head" ref={headRef} onScroll={() => sync(headRef.current, bodyRef.current)} role="rowgroup">
              <div className="rh-cmp-row" role="row">
                <div className="rh-cmp-lab rh-cmp-corner" role="columnheader"><span>{`${n} ${n === 1 ? "home" : "homes"}`}</span><small className="rh-cmp-swipe">{t("Swipe to see all")}</small></div>
                {homes.map((h) => (
                  <div className="rh-cmp-home" role="columnheader" key={h.slug}>
                    <Link to={`/deal/${encodeURIComponent(h.slug)}`} className="rh-cmp-photo">
                      {h.image_urls?.[0] ? <img src={thumb(h.image_urls[0])} alt="" width={240} height={180} loading="lazy" decoding="async" onError={(e) => onThumbError(e.currentTarget, h.image_urls?.[0])} /> : <span className="rh-cmp-nophoto" />}
                    </Link>
                    <b className="rh-cmp-price">{money(h.price_eur)}</b>
                    <Link to={`/deal/${encodeURIComponent(h.slug)}`} className="rh-cmp-title">{String(h.title || "").trim()}</Link>
                    <button type="button" className="rh-cmp-x" aria-label={`${t("Remove")}: ${h.title}`} onClick={() => remove(h.slug)}><X size={16} aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="rh-cmp-body" ref={bodyRef} onScroll={() => sync(bodyRef.current, headRef.current)} tabIndex={0} aria-label={t("Comparison table, scroll sideways on small screens")}>
              {lines.map((g) => (
                <div className="rh-cmp-sec" role="rowgroup" key={g.title}>
                  <div className="rh-cmp-gh" role="row"><span role="rowheader">{t(g.title)}</span></div>
                  {g.lines.map(renderLine)}
                  {g.title === "Home" && hasDims && (
                    <>
                      <div className="rh-cmp-row rh-cmp-more" role="row"><div className="rh-cmp-lab" role="rowheader"><button type="button" className="hunt-link" aria-expanded={showDims} onClick={() => setShowDims((v) => !v)}>{t(showDims ? "Hide score details" : "Show score details")}</button></div></div>
                      {showDims && dimLines.map(renderLine)}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="hunt-fine rh-cmp-fine">{t("Estimates from the listing and typical costs per country. General information, not advice: confirm price, fees, taxes and legal title with the seller and a local lawyer before you commit.")}</p>
        </>
      )}
    </div>
  );
}

function AddHome({ rows, ids, onAdd, onClose }: { rows: CompareRow[]; ids: string[]; onAdd: (slug: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { inp.current?.focus(); }, []);
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const pool = rows.filter((r) => !ids.includes(r.slug) && (!(r as any).publish_at || Date.parse((r as any).publish_at) <= Date.now()));
    if (!words.length) {
      // Nothing typed: homes saved on this device first, then the best homes in the countries being compared.
      const saved = guestSaves().map((g) => pool.find((r) => r.slug === g.slug)).filter(Boolean) as CompareRow[];
      const countries = new Set(rows.filter((r) => ids.includes(r.slug)).map((r) => r.country));
      const near = pool.filter((r) => countries.has(r.country)).sort((a, b) => (b.nota || 0) - (a.nota || 0));
      const top = [...pool].sort((a, b) => (b.nota || 0) - (a.nota || 0));
      return [...new Map([...saved, ...near, ...top].map((r) => [r.slug, r])).values()].slice(0, 6);
    }
    return pool.filter((r) => { const s = `${r.title} ${r.location_name} ${r.country} ${r.slug}`.toLowerCase(); return words.every((w) => s.includes(w)); })
      .sort((a, b) => (b.nota || 0) - (a.nota || 0)).slice(0, 8);
  }, [q, rows, ids.join(",")]);
  return (
    <div className="rh-cmp-add" role="dialog" aria-label={t("Add home")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <label className="rh-cmp-search"><Search size={16} aria-hidden="true" /><span className="sr-only">{t("Search homes")}</span>
        <input ref={inp} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Town, country or type of home")} enterKeyHint="search" autoComplete="off" />
      </label>
      {!q && <small className="rh-cmp-add-hint">{t("Suggestions")}</small>}
      <ul>
        {list.map((r) => (
          <li key={r.slug}>
            <button type="button" onClick={() => onAdd(r.slug)}>
              {r.image_urls?.[0] ? <img src={thumb(r.image_urls[0])} alt="" width={64} height={48} loading="lazy" onError={(e) => onThumbError(e.currentTarget, r.image_urls?.[0])} /> : <span className="rh-cmp-nophoto" />}
              <span><b>{money(r.price_eur)}</b><small>{r.title}</small><small>{r.location_name || r.country}</small></span>
              <Plus size={18} aria-hidden="true" />
            </button>
          </li>
        ))}
        {!list.length && <li className="rh-cmp-na">{t("No homes match. Try a country or a town.")}</li>}
      </ul>
    </div>
  );
}
