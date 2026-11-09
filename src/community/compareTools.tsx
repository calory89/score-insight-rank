// Compare and watch tools (8-nov-2026), small enough to ride in the Community chunk:
//  - CompareToggle: the "Compare" button on home cards (shares rh.compare.homes with ComparePick)
//  - CompareTray: bottom tray "Compare (2)" on every page except /compare, opens /compare?ids=...
//  - PriceWatch: "Tell me if the price drops" on a home page (realhunt.community_watch_home, double opt-in)
//  - SavedHomes: saved page cards with a "Price dropped" badge, the change since saved and "Compare saved"
import { snapshotRaw } from "@/lib/snapshotRaw";
import { lazy, Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Check, Scale, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mediaDeep } from "@/lib/media";
import { thumb, onThumbError } from "@/lib/thumbs";
import { money } from "./api";
import { t } from "./i18n";
import { useCommunity } from "./ctx";
import { usePreference } from "./buyer-state";
import { COMPARE_KEY, MAX_COMPARE, compareHref, priceChange, rememberSavedPrice, savedPrices } from "./compareLogic";
import "./compare-tools.css";

// The public snapshot, read directly (importing @/lib/static-db here would patch supabase.rpc a second time).
let rowsP: Promise<any[]> | null = null;
export function loadRows(): Promise<any[]> {
  return (rowsP ||= snapshotRaw()
    .then((s: any) => mediaDeep(s).rows || []).catch((e) => { rowsP = null; throw e; }));
}

export const ComparePage = lazy(() => import("./ComparePage"));
export function CompareRoute() { return <Suspense fallback={<div className="hunt-wrap" style={{ minHeight: "60vh" }} aria-busy="true" />}><ComparePage /></Suspense>; }

export function useCompare() {
  const [raw, setRaw] = usePreference<string[]>(COMPARE_KEY, []);
  const list = Array.isArray(raw) ? raw.filter((s) => typeof s === "string").slice(0, MAX_COMPARE) : [];
  return [list, setRaw] as const;
}

export function CompareToggle({ deal, className = "" }: { deal: { slug: string; title?: string | null }; className?: string }) {
  const [list, setList] = useCompare();
  const { setNotice } = useCommunity();
  const on = list.includes(deal.slug);
  return (
    <button type="button" className={"rh-cmp-toggle" + (on ? " is-on" : "") + (className ? " " + className : "")} aria-pressed={on}
      aria-label={`${t(on ? "Remove from compare" : "Compare")}: ${deal.title || deal.slug}`} title={t(on ? "In compare" : "Compare")}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (on) { setList(list.filter((s) => s !== deal.slug)); return; }
        if (list.length >= MAX_COMPARE) { setNotice(t("Choose up to four homes. Remove one first.")); return; }
        setList([...list, deal.slug]);
      }}>
      {on ? <Check size={17} aria-hidden="true" /> : <Scale size={17} aria-hidden="true" />}
    </button>
  );
}

export function CompareTray() {
  const [list, setList] = useCompare();
  const { pathname } = useLocation();
  if (!list.length || /^\/compare\/?$/.test(pathname) || /^\/(map|swipe|hunt\/admin)/.test(pathname)) return null;
  const n = list.length;
  return (
    <div className="rh-cmp-tray" role="region" aria-label={t("Compare homes")}>
      <span className="rh-cmp-tray-dots" aria-hidden="true">{Array.from({ length: MAX_COMPARE }, (_, i) => <i key={i} className={i < n ? "is-on" : ""} />)}</span>
      {n < 2 ? <span className="rh-cmp-tray-text">{t("Pick one more to compare")}</span> : null}
      <Link className={"hunt-primary rh-cmp-tray-go" + (n < 2 ? " is-off" : "")} to={compareHref(list)} aria-disabled={n < 2} onClick={(e) => { if (n < 2) e.preventDefault(); }}>
        <Scale size={16} aria-hidden="true" /> <span>{t("Compare")}</span> <span>({n})</span>
      </Link>
      <button type="button" className="rh-cmp-tray-x" aria-label={t("Clear compare")} onClick={() => setList([])}><X size={16} aria-hidden="true" /></button>
    </div>
  );
}

// ------------------------------------------------------------------------------------- price-drop alert
export function PriceWatch({ d }: { d: { slug: string; title?: string | null; price_eur?: number | null } }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"" | "busy" | "ok" | string>(() => { try { return localStorage.getItem("rh_watch_" + d.slug) ? "ok" : ""; } catch { return ""; } });
  useEffect(() => { if (user?.email) setEmail(user.email); else { try { setEmail(localStorage.getItem("rh_watch_email") || ""); } catch { /* ignore */ } } }, [user?.email]);
  if (!d.price_eur) return null;
  async function submit(e: FormEvent) {
    e.preventDefault(); setState("busy");
    try {
      const { data, error } = await (supabase.rpc as any)("community_watch_home", { p_email: email, p_slug: d.slug });
      if (error) throw new Error(t("Something went wrong. Please try again."));
      if (data?.error) throw new Error(t(data.error));
      try { localStorage.setItem("rh_watch_" + d.slug, String(Date.now())); localStorage.setItem("rh_watch_email", email); } catch { /* ignore */ }
      rememberSavedPrice(d.slug, d.price_eur);
      setState("ok");
    } catch (err) { setState((err as Error).message); }
  }
  return (
    <section className={"rh-watch" + (state === "ok" ? " is-on" : "")} aria-labelledby={"rh-watch-" + d.slug}>
      <div className="rh-watch-top">
        <Bell size={18} aria-hidden="true" />
        <div>
          <strong id={"rh-watch-" + d.slug}>{t(state === "ok" ? "Watching this price" : "Tell me if the price drops")}</strong>
          <small>{t(state === "ok" ? "We email you when this home gets cheaper. Every email has a one-click unsubscribe." : "One email when this home gets cheaper. Free, no account needed.")}</small>
        </div>
        {state !== "ok" && !open && <button type="button" className="hunt-secondary" onClick={() => setOpen(true)}>{t("Watch price")}</button>}
      </div>
      {state === "ok" && <p className="rh-watch-done"><Check size={15} aria-hidden="true" /> {t("If this is your first alert, confirm the email we sent you (check spam too).")}</p>}
      {open && state !== "ok" && (
        <form className="rh-watch-form" onSubmit={submit}>
          <label className="sr-only" htmlFor={"rh-watch-email-" + d.slug}>{t("Email")}</label>
          <input id={"rh-watch-email-" + d.slug} type="email" required autoComplete="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="hunt-primary" disabled={state === "busy"}>{t(state === "busy" ? "Saving…" : "Email me")}</button>
          {state && state !== "busy" && <p role="alert" className="hunt-error-text">{state}</p>}
        </form>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------ saved page
export type SavedItem = { id?: string; slug: string; title: string; price_eur: number | null; image: string | null };
export function SavedHomes({ items, empty }: { items: SavedItem[]; empty?: ReactNode }) {
  const [now, setNow] = useState<Record<string, { p: number | null; drop: boolean; img?: string | null }>>({});
  const [, setList] = useCompare();
  useEffect(() => {
    let on = true;
    loadRows().then((rows) => {
      if (!on) return;
      const m: Record<string, { p: number | null; drop: boolean; img?: string | null }> = {};
      for (const it of items) { const r = rows.find((x: any) => x.slug === it.slug); if (r) m[it.slug] = { p: r.price_eur ?? null, drop: Number(r.price_drop) > 0, img: r.image_urls?.[0] || null }; }
      setNow(m);
    }).catch(() => {});
    return () => { on = false; };
  }, [items.map((i) => i.slug).join(",")]);
  const saved = savedPrices();
  // First time a save is seen here without a stored price: remember the price it had at save time if we know it.
  useEffect(() => { for (const it of items) rememberSavedPrice(it.slug, it.price_eur); }, [items.map((i) => i.slug).join(",")]);
  if (!items.length) return <>{empty}</>;
  const slugs = items.map((i) => i.slug);
  return (
    <>
      {items.length >= 2 && (
        <div className="rh-saved-bar">
          <Link className="hunt-secondary" to={compareHref(slugs.slice(0, MAX_COMPARE))} onClick={() => setList(slugs.slice(0, MAX_COMPARE))}><Scale size={16} aria-hidden="true" /> {t("Compare saved")}</Link>
          {items.length > MAX_COMPARE && <small>{t("The first four saved homes. Add or remove homes on the compare page.")}</small>}
        </div>
      )}
      <div className="hunt-small-grid rh-saved-grid">
        {items.map((d) => {
          const cur = now[d.slug]?.p ?? d.price_eur;
          const then = saved[d.slug]?.p ?? d.price_eur;
          const ch = priceChange(then, cur);
          const dropped = (ch && ch.diff < 0) || now[d.slug]?.drop;
          const img = d.image || now[d.slug]?.img || null;
          return (
            <div className="rh-saved-card" key={d.slug}>
              <Link className="hunt-mini" to={`/deal/${encodeURIComponent(d.slug)}`}>
                <span className="rh-saved-img">
                  {img ? <img src={thumb(img)} alt={d.title} loading="lazy" onError={(e) => onThumbError(e.currentTarget, img)} /> : <span className="rh-saved-noimg" />}
                  {dropped && <span className="rh-saved-badge">{t("Price dropped")}</span>}
                </span>
                <div>
                  <strong>{cur ? money(cur) : ""}</strong>
                  {ch && <span className={"rh-saved-change " + (ch.diff < 0 ? "is-down" : "is-up")}>{`${ch.diff < 0 ? "−" : "+"}${money(Math.abs(ch.diff))} (${ch.diff < 0 ? "−" : "+"}${Math.abs(ch.pct)}%)`} <span>{t("since you saved")}</span></span>}
                  <h2>{d.title}</h2>
                </div>
              </Link>
              <CompareToggle deal={d} className="rh-saved-cmp" />
            </div>
          );
        })}
      </div>
    </>
  );
}
