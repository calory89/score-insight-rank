// FIND layer UI (7-nov-2026): the home search box understands sentences ("3 bed near the sea under €200k in
// Portugal"), suggests places with typo tolerance, shows what it understood as removable chips, and the feed
// gets lifestyle chips and saved searches with "N new since last visit". Logic lives in smartsearch.ts.
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, BookmarkPlus, BookmarkCheck, Check, Globe, MapPin, Search, X, Sparkles } from "lucide-react";
import { liveHref } from "./livecta";
import { feed, feedAll, type Row } from "./extras";
import { VIBES } from "./v6";
import { money } from "./api";
import { t } from "./i18n";
import {
  parseQuery, buildPlaces, suggestPlaces, placeLabel, applyParsed, describeParamsWithPlaces, removeChip, canonicalSearch, paramsToFeed, norm,
  LIFESTYLES, lifestyleOn, toggleLifestyle, loadSaved, storeSaved, addSaved, markOpened, removeSaved, countNew, alertsLink,
  type Chip, type Place, type Suggestion, type SavedSearch, type Parsed,
} from "./smartsearch";
import "./find.css";

const VIBE_TERMS: Record<string, string> = Object.fromEntries(VIBES.filter((v) => v.q).map((v) => [v.k, v.q!]));

// ---------------------------------------------------------------- shared data (one snapshot read per visit)
type FindData = { rows: Row[]; places: Place[]; known: (w: string) => boolean };
let dataP: Promise<FindData> | null = null;
function loadFindData(): Promise<FindData> {
  // feedAll goes through the same rpc as the feed (served from the static snapshot in the browser)
  return (dataP ||= feedAll({ scope: "all", sort: "score" } as any).then((f: any) => {
    const rows = (f.rows || []) as Row[];
    const corpus = norm(rows.map((r: any) => `${r.title} ${r.location_name} ${r.country} ${r.category} ${r.why_great || ""}`).join(" \n "));
    const cache = new Map<string, boolean>();
    const known = (w: string) => { let v = cache.get(w); if (v == null) { v = corpus.includes(norm(w)); cache.set(w, v); } return v; };
    return { rows, places: buildPlaces(rows as any), known };
  }).catch((e) => { dataP = null; throw e; }));
}
function useFindData(): FindData | null {
  const [d, setD] = useState<FindData | null>(null);
  useEffect(() => { let live = true; loadFindData().then((x) => live && setD(x)).catch(() => {}); return () => { live = false; }; }, []);
  return d;
}

// What the last sentence search understood, so its chips show under the box until they are removed.
const UNDERSTOOD_KEY = "rh.find.understood";
const readUnderstood = (): { ids: string[]; ignored: string[] } => { try { return JSON.parse(sessionStorage.getItem(UNDERSTOOD_KEY) || "null") || { ids: [], ignored: [] }; } catch { return { ids: [], ignored: [] }; } };
const writeUnderstood = (v: { ids: string[]; ignored: string[] }) => { try { sessionStorage.setItem(UNDERSTOOD_KEY, JSON.stringify(v)); } catch { /* private mode */ } };

const EXAMPLES = ["3 bed near the sea under €200k", "Italy with a garden under €100k", "cabin in Sweden", "2 bed apartment in Spain", "lake"];

type Opt =
  | { kind: "parsed"; id: string; chips: Chip[] }
  | { kind: "place"; id: string; place: Suggestion }
  | { kind: "home"; id: string; row: Row }
  | { kind: "live"; id: string };

// ---------------------------------------------------------------- 1 + 2: the search box
export function FindSearch({ value, inputRef }: { value: string; inputRef?: RefObject<HTMLInputElement> }) {
  const data = useFindData();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [understood, setUnderstood] = useState(readUnderstood);
  const uid = useId().replace(/:/g, "");
  const listId = "rh-find-list-" + uid;
  const blurT = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setText(value), [value]);

  const places = data?.places || [];
  const q = text.trim();
  const tokens = q.split(/\s+/).filter(Boolean);
  // Long sentences: suggest places for the word being typed; short text: for the whole text.
  const frag = tokens.length > 2 ? tokens[tokens.length - 1] : q;
  const parsed: Parsed | null = useMemo(() => (q.length >= 2 && data ? parseQuery(q, places, data.known) : null), [q, data]);
  const preview = useMemo(() => (parsed?.structured ? describeParamsWithPlaces(applyParsed(new URLSearchParams(), parsed), places) : []), [parsed]);
  const opts: Opt[] = useMemo(() => {
    if (q.length < 2) return [];
    const out: Opt[] = [];
    const sugg = suggestPlaces(frag, places, tokens.length > 2 ? 4 : 5);
    // the "Search for" row only when it adds something to the place rows below it
    if (preview.length > 1 || (preview.length === 1 && !sugg.some((p) => p.name === preview[0].label))) out.push({ kind: "parsed", id: "parsed", chips: preview });
    for (const p of sugg) out.push({ kind: "place", id: "p-" + p.key + p.country, place: p });
    if (data && tokens.length <= 2) {
      const nq = norm(q);
      data.rows.filter((r: any) => norm(`${r.title}`).includes(nq)).slice(0, 3).forEach((r: any) => out.push({ kind: "home", id: "h-" + r.id, row: r }));
    }
    // last: search the web live for the whole sentence (livesearch.tsx)
    if (q.length >= 3) out.push({ kind: "live", id: "live" });
    return out;
  }, [q, frag, preview, data]);
  useEffect(() => setActive(-1), [q]);

  const go = (next: URLSearchParams) => {
    if (pathname === "/") setParams(next);
    else navigate("/" + (next.toString() ? "?" + next.toString() : ""));
  };
  const submit = (raw: string) => {
    const s = raw.trim();
    setOpen(false); setActive(-1);
    if (!s) { const next = new URLSearchParams(params); next.delete("q"); next.delete("search"); writeUnderstood({ ids: [], ignored: [] }); setUnderstood({ ids: [], ignored: [] }); go(next); return; }
    const p = parseQuery(s, places, data?.known);
    let next: URLSearchParams;
    if (p.structured) {
      next = applyParsed(params, p);
      const mine = describeParamsWithPlaces(applyParsed(new URLSearchParams(), p), places).map((c) => c.id);
      const u = { ids: mine, ignored: p.ignored };
      writeUnderstood(u); setUnderstood(u);
      // the box keeps the words the filters do not cover; the rest is now in the chips
      setText(next.get("q") || "");
    } else {
      next = new URLSearchParams(params); next.set("q", s); next.delete("search");
      writeUnderstood({ ids: [], ignored: [] }); setUnderstood({ ids: [], ignored: [] });
    }
    go(next);
  };
  const choose = (o: Opt) => {
    if (o.kind === "home") { setOpen(false); navigate(`/deal/${encodeURIComponent(o.row.slug)}`); return; }
    if (o.kind === "live") { setOpen(false); navigate(liveHref(text)); return; }
    if (o.kind === "parsed") { submit(text); return; }
    const name = o.place.name;
    const s = tokens.length > 2 ? [...tokens.slice(0, -1), name].join(" ") : name;
    setText(s); submit(s);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!opts.length) return;
      e.preventDefault(); setOpen(true);
      setActive((n) => { const d = e.key === "ArrowDown" ? 1 : -1; const m = opts.length; return n < 0 ? (d > 0 ? 0 : m - 1) : (n + d + m) % m; });
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); setActive(-1); } else if (text) { setText(""); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && opts[active]) choose(opts[active]); else submit(text);
    } else if (e.key === "Tab") setOpen(false);
  };

  // chips of the last sentence search that are still applied
  const current = useMemo(() => describeParamsWithPlaces(params, places), [params, places]);
  // After a sentence search the row sums up every filter that is on (the search's and any others), so the
  // Filters bar hides its own smaller chips meanwhile (find.css). It goes away once the search's own filters are all removed.
  const shown = current.some((c) => understood.ids.includes(c.id)) ? current : [];
  const removeOne = (c: Chip) => {
    const next = removeChip(params, c);
    const u = { ...understood, ids: understood.ids.filter((x) => x !== c.id) };
    writeUnderstood(u); setUnderstood(u);
    if (c.param === "q") setText(next.get("q") || "");
    go(next);
  };
  const clearAll = () => {
    let next = new URLSearchParams(params);
    for (const c of shown) next = removeChip(next, c);
    const u = { ids: [], ignored: [] }; writeUnderstood(u); setUnderstood(u); setText(next.get("q") || ""); go(next);
  };
  const showList = open && (q.length < 2 || opts.length > 0);

  return (
    <div className="hv-smart rf-find">
      <form className="hv-search" role="search" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <Search size={18} aria-hidden="true" />
        <input ref={inputRef} type="search" value={text} role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 && opts[active] ? `${listId}-${active}` : undefined}
          onFocus={() => { clearTimeout(blurT.current); setOpen(true); }} onBlur={() => { blurT.current = setTimeout(() => setOpen(false), 160); }}
          onKeyDown={onKey} onChange={(e) => { setText(e.target.value); setOpen(true); }}
          placeholder={t("Try: 2 bed by the sea under €150k")} aria-label={t("Search homes")} enterKeyHint="search" autoComplete="off" spellCheck={false} />
        {text && <button type="button" aria-label={t("Clear search")} onClick={() => { setText(""); inputRef?.current?.focus(); }}><X size={16} /></button>}
      </form>
      {showList && (q.length < 2 ? (
        <div className="hv-sugg rf-sugg" id={listId} onMouseDown={(e) => e.preventDefault()}>
          <small>{t("Type a place or a whole sentence")}</small>
          <div className="hv-sugg-pills">{EXAMPLES.map((s) => <button type="button" key={s} onClick={() => { setText(s); submit(s); }}>{s}</button>)}</div>
        </div>
      ) : (
        <ul className="hv-sugg rf-sugg" id={listId} role="listbox" aria-label={t("Suggestions")} onMouseDown={(e) => e.preventDefault()}>
          {opts.map((o, i) => (
            <li key={o.id} id={`${listId}-${i}`} role="option" aria-selected={active === i} className={"rf-opt" + (active === i ? " is-active" : "")}
              onMouseEnter={() => setActive(i)} onClick={() => choose(o)}>
              {o.kind === "parsed" ? (<>
                <span className="rf-opt-icon" aria-hidden="true"><Sparkles size={16} /></span>
                <span className="rf-opt-main"><strong>{t("Search for")}</strong><small>{o.chips.map((c) => t(c.label)).join(" · ")}</small></span>
              </>) : o.kind === "live" ? (<>
                <span className="rf-opt-icon" aria-hidden="true"><Globe size={16} /></span>
                <span className="rf-opt-main"><strong>{t("Search the web live for:")} {q}</strong><small>{t("Estate agents and portals, only homes scoring 80+")}</small></span>
              </>) : o.kind === "place" ? (<>
                <span className="rf-opt-icon" aria-hidden="true"><MapPin size={16} /></span>
                <span className="rf-opt-main"><strong>{placeLabel(o.place)}</strong><small>{o.place.n} {o.place.n === 1 ? t("home") : t("homes")}{o.place.score >= 4 ? ` · ${t("did you mean this?")}` : ""}</small></span>
              </>) : (<>
                <span className="rf-opt-icon is-img" aria-hidden="true">{o.row.image_urls?.[0] ? <img src={o.row.image_urls[0]} alt="" /> : <MapPin size={16} />}</span>
                <span className="rf-opt-main"><strong>{o.row.title}</strong><small>{money(o.row.price_eur)} · {o.row.location_name}</small></span>
              </>)}
            </li>
          ))}
        </ul>
      ))}
      {(shown.length > 0 || understood.ignored.length > 0) && (
        <div className="rf-understood" aria-live="polite">
          {shown.length > 0 && <span className="rf-understood-label">{t("Showing")}</span>}
          {shown.map((c) => <button type="button" key={c.id} className="rf-chip" onClick={() => removeOne(c)} aria-label={`${t("Remove")} ${t(c.label)}`}><span>{t(c.label)}</span><X size={14} aria-hidden="true" /></button>)}
          {shown.length > 1 && <button type="button" className="hunt-link rf-clear" onClick={clearAll}>{t("Clear")}</button>}
          {understood.ignored.length > 0 && <small className="rf-ignored">{t("No home mentions")}: {understood.ignored.join(", ")}</small>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 4: saved searches store (this device)
function useSaved(): [SavedSearch[], (f: (l: SavedSearch[]) => SavedSearch[]) => void] {
  const [list, setList] = useState<SavedSearch[]>(() => loadSaved());
  useEffect(() => { const on = () => setList(loadSaved()); window.addEventListener("rh-saved-searches", on); window.addEventListener("storage", on); return () => { window.removeEventListener("rh-saved-searches", on); window.removeEventListener("storage", on); }; }, []);
  const update = (f: (l: SavedSearch[]) => SavedSearch[]) => { const next = f(loadSaved()); storeSaved(next); setList(next); window.dispatchEvent(new Event("rh-saved-searches")); };
  return [list, update];
}
/** "N new" per saved search: homes approved after it was last opened. */
function useNewCounts(list: SavedSearch[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = list.map((s) => s.qs + "@" + s.opened).join("|");
  useEffect(() => {
    let live = true;
    Promise.all(list.map(async (s) => {
      try { const f: any = await feed({ ...paramsToFeed(new URLSearchParams(s.qs), VIBE_TERMS), sort: "new", limit: 100 } as any); return [s.qs, countNew(f.rows || [], s.opened)] as const; }
      catch { return [s.qs, 0] as const; }
    })).then((r) => live && setCounts(Object.fromEntries(r)));
    return () => { live = false; };
  }, [key]);
  return counts;
}
const labelFor = (sp: URLSearchParams, places: Place[]) => describeParamsWithPlaces(sp, places).map((c) => c.label).join(" · ").replace(/^./, (c) => c.toUpperCase());

// ---------------------------------------------------------------- 3 + 4: the bar above the feed
export function FindBar() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const data = useFindData();
  const [saved, setSaved] = useSaved();
  const counts = useNewCounts(saved);
  const qs = canonicalSearch(params);
  const isSaved = !!qs && saved.some((s) => s.qs === qs);
  const [lc, setLc] = useState<Record<string, number>>({});
  // A lifestyle chip only shows when switching it on still leaves homes (like the quick filters).
  useEffect(() => {
    let live = true;
    Promise.all(LIFESTYLES.map(async (l) => {
      const sp = lifestyleOn(params, l) ? params : toggleLifestyle(params, l);
      try { const f: any = await feed({ ...paramsToFeed(sp, VIBE_TERMS), limit: 1 } as any); return [l.k, Number(f.total) || 0] as const; } catch { return [l.k, -1] as const; }
    })).then((r) => live && setLc(Object.fromEntries(r)));
    return () => { live = false; };
  }, [qs]);
  // Opening a saved search (from here, a link or the saved page) resets its "new" count.
  useEffect(() => { if (isSaved) { const t0 = setTimeout(() => setSaved((l) => markOpened(l, qs)), 2500); return () => clearTimeout(t0); } }, [qs, isSaved]);
  const set = (next: URLSearchParams) => setParams(next);
  const others = saved.filter((s) => s.qs !== qs);
  return (
    <div className="rf-bar">
      <nav className="rf-life" aria-label={t("Lifestyle")}>
        {LIFESTYLES.map((l) => {
          const on = lifestyleOn(params, l);
          if (!on && lc[l.k] === 0) return null;
          return <button type="button" key={l.k} aria-pressed={on} className="rf-life-chip" onClick={() => set(toggleLifestyle(params, l))}>
            {on && <Check size={14} aria-hidden="true" />}<span>{t(l.label)}</span>{!on && lc[l.k] > 0 && <small>{lc[l.k]}</small>}
          </button>;
        })}
      </nav>
      {others.length > 0 && (
        <div className="rf-saved-row" role="group" aria-label={t("Your searches")}>
          <span className="rf-saved-label">{t("Your searches")}</span>
          {others.slice(0, 8).map((s) => (
            <button type="button" key={s.qs} className="rf-saved-pill" onClick={() => { setSaved((l) => markOpened(l, s.qs)); navigate("/?" + s.qs); }}>
              <span>{s.label}</span>{counts[s.qs] > 0 && <b>{counts[s.qs] >= 100 ? "99+" : counts[s.qs]} {t("new")}</b>}
            </button>
          ))}
        </div>
      )}
      {qs && (
        <div className="rf-saved-row">
          {isSaved
            ? <button type="button" className="rf-save is-on" aria-pressed="true" onClick={() => setSaved((l) => removeSaved(l, qs))}><BookmarkCheck size={16} aria-hidden="true" /><span>{t("Search saved")}</span></button>
            : <button type="button" className="rf-save" aria-pressed="false" onClick={() => setSaved((l) => addSaved(l, qs, labelFor(params, data?.places || [])))}><BookmarkPlus size={16} aria-hidden="true" /><span>{t("Save this search")}</span></button>}
          <Link className="rf-alert" to={alertsLink(params)}><Bell size={15} aria-hidden="true" /><span>{t("Email alerts")}</span></Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 4: list on the saved page
export function SavedSearches() {
  const [saved, setSaved] = useSaved();
  const counts = useNewCounts(saved);
  const navigate = useNavigate();
  if (!saved.length) return (
    <section className="rf-saved-page is-empty">
      <h2>{t("Saved searches")}</h2>
      <p>{t("Search or filter the homes, then tap “Save this search”. We show how many homes are new each time you come back.")}</p>
    </section>
  );
  return (
    <section className="rf-saved-page">
      <h2>{t("Saved searches")}</h2>
      <p className="hunt-fine">{t("Saved on this device. New means approved since you last opened the search.")}</p>
      <ul>
        {saved.map((s) => {
          const n = counts[s.qs] || 0;
          return (
            <li key={s.qs}>
              <button type="button" className="rf-saved-open" onClick={() => { setSaved((l) => markOpened(l, s.qs)); navigate("/?" + s.qs); }}>
                <strong>{s.label}</strong>
                <small>{n > 0 ? `${n >= 100 ? "99+" : n} ${n === 1 ? t("new home since your last visit") : t("new homes since your last visit")}` : t("Nothing new since your last visit")}</small>
              </button>
              <Link className="rf-icon-btn" to={alertsLink(new URLSearchParams(s.qs))} aria-label={`${t("Email alerts")}: ${s.label}`}><Bell size={17} /></Link>
              <button type="button" className="rf-icon-btn" aria-label={`${t("Remove")}: ${s.label}`} onClick={() => setSaved((l) => removeSaved(l, s.qs))}><X size={17} /></button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
