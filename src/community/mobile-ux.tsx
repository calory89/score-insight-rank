// Phone UX batch (7-nov-2026, Carlos: realhunt faster and easier on his iPhone).
//  - FeedFilters: on phones (< 760 px) the feed filters fold behind one "Filters" button that opens a bottom sheet
//    with the same Filters component, removable chips for what is on, and a sticky "Show N homes" button.
//    Desktop keeps the inline filters. Same look as the /map filter button.
//  - FooterLinks: the footer links in 4 groups (Homes, Research, Company, Legal). On phones each group is an
//    accordion; every link stays in the DOM for crawlers. On desktop the links flow as before.
//  - Skeletons for the home page and the blog while their data loads.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Filters, type FeedParams } from "./extras";
import { activeChips, clearedFilters } from "./filterChips";
import { t } from "./i18n";
import "./mobile-ux.css";

const NARROW = "(max-width: 759.98px)";
export function useNarrow(query = NARROW) {
  const get = () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const fn = () => setOn(mq.matches);
    fn();
    mq.addEventListener?.("change", fn);
    return () => mq.removeEventListener?.("change", fn);
  }, [query]);
  return on;
}
const nf = (n: number) => new Intl.NumberFormat("en").format(n);

// ---------------------------------------------------------------- filters: inline on desktop, bottom sheet on phones
type FProps = { countries: Record<string, number>; value: FeedParams; onChange: (v: FeedParams) => void; total?: number | null; busy?: boolean };
export function FeedFilters(p: FProps) {
  const narrow = useNarrow();
  if (!narrow) return <div className="rh-sticky-filters"><Filters countries={p.countries} value={p.value} onChange={p.onChange} /></div>;
  return <MobileFilters {...p} />;
}

function ChipRow({ value, onChange, className }: { value: FeedParams; onChange: (v: FeedParams) => void; className: string }) {
  const chips = activeChips(value, t);
  if (!chips.length) return null;
  return (
    <div className={className} role="group" aria-label={t("Active filters")}>
      {chips.map((c) => <button key={c.key} type="button" className="rh-mf-chip" aria-label={`${t("Remove")} ${c.label}`} onClick={() => onChange(c.next)}><span>{c.label}</span><X size={14} aria-hidden="true" /></button>)}
    </div>
  );
}

export function MobileFilters({ countries, value, onChange, total, busy }: FProps) {
  const location = useLocation();
  const [open, setOpen] = useState(() => typeof location !== "undefined" && location.hash === "#filters");
  const n = activeChips(value).length;
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="rh-mf-bar">
        <button ref={btn} type="button" className={"hunt-mapfilters rh-mf-open" + (n ? " is-on" : "")} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <SlidersHorizontal size={15} /> {t("Filters")}{n ? <b>{n}</b> : null}
        </button>
        <ChipRow value={value} onChange={onChange} className="rh-mf-chips" />
      </div>
      {open && <FilterSheet countries={countries} value={value} onChange={onChange} total={total} busy={busy} onClose={() => { setOpen(false); if (location.hash === "#filters") history.replaceState(history.state, "", location.pathname + location.search); requestAnimationFrame(() => btn.current?.focus()); }} />}
    </>
  );
}

function FilterSheet({ countries, value, onChange, total, busy, onClose }: FProps & { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  const n = activeChips(value).length;
  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("rh-sheet-open");
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; document.documentElement.classList.remove("rh-sheet-open"); };
  }, []);
  const label = busy && total == null ? t("Updating results…") : total === 0 ? t("No homes match") : `${t("Show")} ${nf(total || 0)} ${t(total === 1 ? "home" : "homes")}`;
  return (
    <div className="rh-fs-root">
      <div className="rh-fs-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="rh-fs" role="dialog" aria-modal="true" aria-labelledby="rh-fs-title"
        onKeyDown={(e) => { if (e.key !== "Tab") return; const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), select, input, a[href]")); const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }}>
        <span className="rh-fs-grip" aria-hidden="true" />
        <header className="rh-fs-head">
          <h2 id="rh-fs-title">{t("Filters")}</h2>
          {n > 0 && <button type="button" className="hunt-link rh-fs-clear" onClick={() => onChange(clearedFilters(value))}>{t("Clear all")}</button>}
          <button ref={close} type="button" className="rh-fs-x" aria-label={t("Close filters")} onClick={onClose}><X size={20} /></button>
        </header>
        <ChipRow value={value} onChange={onChange} className="rh-fs-chips" />
        <div className="rh-fs-body"><Filters countries={countries} value={value} onChange={onChange} expanded /></div>
        <footer className="rh-fs-foot">
          <button type="button" className="hunt-primary rh-fs-show" onClick={onClose} aria-live="polite">{label}</button>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- footer links in groups
const COUNTRIES: [string, string][] = [["spain", "Spain"], ["italy", "Italy"], ["denmark", "Denmark"], ["sweden", "Sweden"], ["france", "France"], ["poland", "Poland"], ["united-states", "United States"], ["japan", "Japan"], ["germany", "Germany"], ["netherlands", "Netherlands"], ["greece", "Greece"], ["switzerland", "Switzerland"], ["mexico", "Mexico"], ["canada", "Canada"], ["bulgaria", "Bulgaria"]];
// [to, label, mobileOnly]. mobileOnly links are shown elsewhere on desktop (country row, tools row) and only
// appear inside the accordions on phones.
type L = [string, string, boolean?];
const GROUPS: { key: string; title: string; links: L[] }[] = [
  { key: "homes", title: "Homes", links: [["/", "All homes"], ["/cheap-houses", "Cheap houses"], ["/new-builds", "New builds"], ["/new", "New homes"], ["/top", "Top 100 rankings"], ["/insider", "Insider"], ["/alerts", "Alerts"], ["/help-buying", "Help buying", true], ...COUNTRIES.map(([k, l]) => [`/homes/${k}`, `Homes in ${l}`, true] as L)] },
  { key: "research", title: "Research", links: [["/blog", "Research"], ["/costs", "Real costs"], ["/research", "Data to quote"], ["/research/prices", "Prices by country"], ["/what-100k-buys", "What €100,000 buys"], ["/price-drops", "Price drops"], ["/sources", "Where the homes come from"], ["/research/property-portals", "Property portals by country"], ["/research/country-facts", "Key facts by country"], ["/research/open-data", "Open data"], ["/research/new-builds", "New-build report"], ["/method", "How the score works"], ["/top/how-we-rank", "How we rank"], ["/guide", "Guides", true]] },
  { key: "company", title: "Company", links: [["/about", "About us"], ["/press", "Press page"], ["/editorial-policy", "Editorial policy"], ["/agents", "For agents"], ["/network", "For developers"], ["/leaderboard", "Hunters", true], ["/invite", "Invite", true], ["/sitemap", "Site map"]] },
  // 20-nov-2026: the pages that say how homes are checked and what RealHunt never does (seo/trustMore.ts)
  { key: "trust", title: "Trust", links: [["/method", "How the score works", true], ["/how-we-check-homes", "How we check homes"], ["/what-we-reject", "Which homes we reject"], ["/editorial-policy", "Editorial policy", true], ["/corrections", "Corrections"], ["/how-we-make-money", "How we make money"], ["/what-we-never-do", "What we never do"]] },
  { key: "legal", title: "Legal", links: [["/legal/privacy", "Privacy"], ["/legal/terms", "Terms"], ["/sitemap", "Site map"]] },
];
const label = (s: string) => (s.startsWith("Homes in ") ? `${t("Homes in")} ${t(s.slice(9))}` : t(s));

export function FooterLinks({ admin = false }: { admin?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="rh-flinks">
      {GROUPS.map((g) => {
        const on = open === g.key;
        const links: ReactNode[] = g.links.map(([to, l, m]) => <Link key={to} to={to} className={m ? "rh-fl-m" : undefined}>{label(l)}</Link>);
        if (g.key === "legal" && admin) links.push(<Link key="mod" to="/hunt/admin">Moderation</Link>, <Link key="inbox" to="/hunt/inbox">Inbox</Link>);
        return (
          <div key={g.key} className={"rh-fgroup" + (on ? " is-open" : "")}>
            <h2 className="rh-fgroup-h"><button type="button" aria-expanded={on} aria-controls={"rh-fg-" + g.key} onClick={() => setOpen(on ? null : g.key)}>{t(g.title)}<ChevronDown size={18} aria-hidden="true" /></button></h2>
            <div className="rh-fgroup-links" id={"rh-fg-" + g.key}>{links}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- skeletons
export function DealSkeleton() {
  return (
    <div className="hunt-wrap hunt-detail hv-detail rh-sk-deal" role="status" aria-label={t("Loading…")}>
      <div className="rh-sk rh-sk-gallery" />
      <div className="rh-sk-cols">
        <div>
          <i className="rh-sk rh-sk-line is-xs" />
          <i className="rh-sk rh-sk-line is-h1" />
          <i className="rh-sk rh-sk-line is-h1 is-short" />
          <i className="rh-sk rh-sk-line is-price" />
          <div className="rh-sk-pills"><i className="rh-sk" /><i className="rh-sk" /><i className="rh-sk" /></div>
          {[0, 1, 2, 3].map((n) => <i key={n} className={"rh-sk rh-sk-line" + (n === 3 ? " is-short" : "")} />)}
        </div>
        <aside className="rh-sk rh-sk-aside" />
      </div>
    </div>
  );
}
export function BlogListSkeleton() {
  return (
    <div className="hv-blog-list rh-sk-blog" role="status" aria-label={t("Loading…")}>
      {[0, 1, 2, 3, 4].map((n) => (
        <div key={n} className={"hv-blog-card" + (n === 0 ? " is-lead" : "")} aria-hidden="true">
          <i className="rh-sk rh-sk-img" />
          <span><i className="rh-sk rh-sk-line is-xs" /><i className="rh-sk rh-sk-line is-h2" /><i className="rh-sk rh-sk-line" /><i className="rh-sk rh-sk-line is-short" /></span>
        </div>
      ))}
    </div>
  );
}
export function PostSkeleton() {
  return (
    <div className="hunt-wrap hunt-page hv-post rh-sk-post" role="status" aria-label={t("Loading…")}>
      <i className="rh-sk rh-sk-line is-xs" />
      <i className="rh-sk rh-sk-line is-h1" />
      <i className="rh-sk rh-sk-line is-h1 is-short" />
      <i className="rh-sk rh-sk-line is-short" />
      <i className="rh-sk rh-sk-img" />
      {[0, 1, 2, 3, 4, 5].map((n) => <i key={n} className={"rh-sk rh-sk-line" + (n % 3 === 2 ? " is-short" : "")} />)}
    </div>
  );
}
