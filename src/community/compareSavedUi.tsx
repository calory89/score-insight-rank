// Saved page and shared lists (moved out of compareTools.tsx on 26-nov-2026 so the Community chunk stays small).
// 26-nov-2026 (batch 18): each card says when the home left RealHunt, its advert went offline or could not be confirmed
// (with a way to similar homes), the badge says how much it dropped, the list can be sorted, downloaded as a CSV, put
// in the calendar as a visit, and every price can be watched with one email.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarPlus, Check, Download, Link2, NotebookPen, Printer, Scale, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { thumb, onThumbError } from "@/lib/thumbs";
import { money } from "./api";
import { t } from "./i18n";
import { tr } from "@/lib/lang";
import { usePreference } from "./buyer-state";
import { useCommunity } from "./ctx";
import { MAX_COMPARE, compareHref, priceChange, rememberSavedPrice, savedPrices } from "./compareLogic";
import { NOTES_KEY, cleanNotes, listHref, parseList } from "./n10/logic";
import { isGuestSaved, toggleGuestSave } from "./guestSaves";
import { SORTS, download, savedState, sortSaved, toCsv, visitIcs, type SavedState, type SortKey } from "./compareSaved";
import { CompareToggle, loadRows, useCompare, type SavedItem } from "./compareTools";
import "./compare-saved.css";

const STATE_TEXT: Record<Exclude<SavedState, "ok">, string> = {
  removed: "No longer on RealHunt",
  gone: "Advert no longer online",
  unconfirmed: "Not confirmed for sale",
};
export function SavedHomes({ items, empty, share = true }: { items: SavedItem[]; empty?: ReactNode; share?: boolean }) {
  const [rawNotes] = usePreference<unknown>(NOTES_KEY, {});
  const notes = cleanNotes(rawNotes);
  const [rows, setRows] = useState<Record<string, any>>({});
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = usePreference<SortKey>("rh.saved.sort", "saved");
  const [hidden, setHidden] = useState<string[]>([]);
  const [, setList] = useCompare();
  useEffect(() => {
    let on = true;
    loadRows().then((all) => {
      if (!on) return;
      const m: Record<string, any> = {};
      for (const it of items) { const r = all.find((x: any) => x.slug === it.slug); if (r) m[it.slug] = r; }
      setRows(m); setLoaded(true);
    }).catch(() => {});
    return () => { on = false; };
  }, [items.map((i) => i.slug).join(",")]);
  const saved = savedPrices();
  // First time a save is seen here without a stored price: remember the price it had at save time if we know it.
  useEffect(() => { for (const it of items) rememberSavedPrice(it.slug, it.price_eur); }, [items.map((i) => i.slug).join(",")]);
  if (!items.length) return <>{empty}</>;
  const by: SortKey = SORTS.some(([k]) => k === sort) ? sort : "saved";
  const cur = (d: SavedItem) => rows[d.slug]?.price_eur ?? d.price_eur;
  const list = sortSaved(items.filter((d) => !hidden.includes(d.slug)), by, cur, (d) => rows[d.slug]?.nota);
  const slugs = list.map((i) => i.slug);
  const live = list.filter((d) => savedState(rows[d.slug], loaded) === "ok");
  const csv = () => {
    const origin = typeof location !== "undefined" ? location.origin : "https://realhunt.co";
    download("realhunt-saved-homes.csv", toCsv(
      ["Title", "Price (EUR)", "Change since saved (EUR)", "Where", "Country", "Floor area (m²)", "Bedrooms", "Score", "Status", "Note", "RealHunt page", "Original advert"].map(tr),
      list.map((d) => { 
        const r = rows[d.slug] || {}; const ch = priceChange(saved[d.slug]?.p ?? d.price_eur, cur(d)); const st = savedState(rows[d.slug], loaded);
        return [d.title || r.title, cur(d) ?? "", ch ? ch.diff : "", r.location_name || "", r.country || "", r.sqm ?? "", r.bedrooms ?? "", r.nota ?? "",
          tr(st === "ok" ? "Listed" : STATE_TEXT[st]), notes[d.slug]?.text || "", `${origin}/deal/${encodeURIComponent(d.slug)}`, r.source_url || ""];
      })));
    try { (window as any).clarity?.("event", "saved_csv"); } catch { /* blocked */ }
  };
  return (
    <>
      <div className="rh-saved-bar">
        {live.length >= 2 && <Link className="hunt-secondary" to={compareHref(live.slice(0, MAX_COMPARE).map((d) => d.slug))} onClick={() => setList(live.slice(0, MAX_COMPARE).map((d) => d.slug))}><Scale size={16} aria-hidden="true" /> {t("Compare saved")}</Link>}
        {share && <ShareListButton slugs={slugs} />}
        <button type="button" className="hunt-secondary" onClick={csv}><Download size={16} aria-hidden="true" /> {t("Download CSV")}</button>
        <button type="button" className="hunt-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> {t("Print")}</button>
        {items.length >= 2 && (
          <label className="rh-saved-sort"><span>{t("Sort")}</span>
            <select value={by} onChange={(e) => setSort(e.target.value as SortKey)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select>
          </label>
        )}
        {live.length > MAX_COMPARE && <small>{t("The first four saved homes. Add or remove homes on the compare page.")}</small>}
      </div>
      {share && live.length > 0 && <WatchAll slugs={live.filter((d) => cur(d)).map((d) => d.slug)} />}
      <div className="hunt-small-grid rh-saved-grid">
        {list.map((d) => {
          const r = rows[d.slug];
          const now = cur(d);
          const then = saved[d.slug]?.p ?? d.price_eur;
          const ch = priceChange(then, now);
          const dropped = (ch && ch.diff < 0) || Number(r?.price_drop) > 0;
          const img = d.image || r?.image_urls?.[0] || null;
          const st = savedState(r, loaded);
          const similar = r?.country ? `/?country=${encodeURIComponent(r.country)}` : "/";
          return (
            <div className={"rh-saved-card" + (st !== "ok" ? " is-" + st : "")} key={d.slug}>
              <Link className="hunt-mini" to={st === "removed" ? similar : `/deal/${encodeURIComponent(d.slug)}`}>
                <span className="rh-saved-img">
                  {img ? <img src={thumb(img)} alt={d.title} loading="lazy" onError={(e) => onThumbError(e.currentTarget, img)} /> : <span className="rh-saved-noimg" />}
                  {st === "ok" && dropped && <span className="rh-saved-badge">{ch && ch.diff < 0 ? <>{t("Down")} {money(Math.abs(ch.diff))}</> : t("Price dropped")}</span>}
                  {st !== "ok" && <span className={"rh-saved-badge rh-saved-state is-" + st}>{t(STATE_TEXT[st])}</span>}
                </span>
                <div>
                  <strong>{now ? money(now) : ""}</strong>
                  {ch && st === "ok" && <span className={"rh-saved-change " + (ch.diff < 0 ? "is-down" : "is-up")}>{`${ch.diff < 0 ? "−" : "+"}${money(Math.abs(ch.diff))} (${ch.diff < 0 ? "−" : "+"}${Math.abs(ch.pct)}%)`} <span>{t("since you saved")}</span></span>}
                  <h2>{d.title}</h2>
                  {notes[d.slug] && <p className="rh-saved-note"><NotebookPen size={13} aria-hidden="true" /> <span>{notes[d.slug].text}</span></p>}
                </div>
              </Link>
              {st !== "ok" && (
                <p className="rh-saved-why" role="note">
                  {t(st === "removed" ? "This home was taken off RealHunt, usually because it sold or the advert ended." : st === "gone" ? "The original advert was missing on two different days. It may have sold." : "We could not confirm in the last 30 days that it is still for sale. Ask the agent before you plan a visit.")}{" "}
                  <Link to={similar}>{t(r?.country ? "See similar homes" : "See the best homes")}</Link>
                </p>
              )}
              {st !== "removed" && <CompareToggle deal={d} className="rh-saved-cmp" />}
              {st !== "removed" && <PlanVisit d={d} where={r?.location_name} />}
              <RemoveSaved d={d} onDone={() => setHidden((h) => [...h, d.slug])} />
            </div>
          );
        })}
      </div>
    </>
  );
}

/** "Remove" on each saved card (list 889: the button that works everywhere; there is no swipe gesture to learn). */
function RemoveSaved({ d, onDone }: { d: SavedItem; onDone: () => void }) {
  const { user, setSession, call, setNotice } = useCommunity();
  const [busy, setBusy] = useState(false);
  if (!d.id) return null;
  const go = async () => {
    if (!user) { if (isGuestSaved(d.id!)) toggleGuestSave({ id: d.id!, slug: d.slug }); onDone(); setNotice(t("Removed from saved.")); return; }
    setBusy(true);
    try {
      await call("save", { id: d.id, saved: false });
      setSession((s: any) => (s ? { ...s, saved: s.saved.filter((x: string) => x !== d.id) } : s));
      onDone(); setNotice(t("Removed from saved."));
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  };
  return <button type="button" className="hunt-link rh-saved-remove" disabled={busy} onClick={go} aria-label={`${t("Remove from saved")}: ${d.title || d.slug}`}><Trash2 size={14} aria-hidden="true" /> {t("Remove")}</button>;
}

/** "Plan a visit": a date, then a calendar file (.ics) the phone or computer adds to its calendar. Nothing is sent. */
function PlanVisit({ d, where }: { d: SavedItem; where?: string | null }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const go = (e: FormEvent) => {
    e.preventDefault();
    const url = (typeof location !== "undefined" ? location.origin : "https://realhunt.co") + `/deal/${encodeURIComponent(d.slug)}`;
    const ics = visitIcs({ slug: d.slug, title: d.title || d.slug, url, day, where });
    if (!ics) return;
    download(`visit-${d.slug}.ics`, ics, "text/calendar;charset=utf-8");
    setOpen(false);
    try { (window as any).clarity?.("event", "saved_visit_ics"); } catch { /* blocked */ }
  };
  if (!open) return <button type="button" className="hunt-link rh-saved-visit" onClick={() => setOpen(true)}><CalendarPlus size={14} aria-hidden="true" /> {t("Plan a visit")}</button>;
  return (
    <form className="rh-saved-visitform" onSubmit={go}>
      <label><span className="sr-only">{t("Visit date")}</span><input type="date" required min={today} value={day} onChange={(e) => setDay(e.target.value)} /></label>
      <button className="hunt-secondary" disabled={!day}>{t("Add to calendar")}</button>
      <button type="button" className="hunt-link" onClick={() => setOpen(false)}>{t("Cancel")}</button>
    </form>
  );
}

/** One email address, a price alert on every saved home (realhunt.community_watch_home, double opt-in, one-click
 * unsubscribe in every email). Homes already watched from this browser are skipped. */
function WatchAll({ slugs }: { slugs: string[] }) {
  const { user } = useAuth();
  const todo = slugs.filter((s) => { try { return !localStorage.getItem("rh_watch_" + s); } catch { return true; } }).slice(0, 50);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"" | "busy" | "ok" | string>("");
  useEffect(() => { if (user?.email) setEmail(user.email); else { try { setEmail(localStorage.getItem("rh_watch_email") || ""); } catch { /* ignore */ } } }, [user?.email]);
  if (!todo.length && state !== "ok") return <p className="hunt-fine rh-saved-watch is-on"><Bell size={14} aria-hidden="true" /> {t("You get an email when any saved home drops in price.")}</p>;
  async function submit(e: FormEvent) {
    e.preventDefault(); setState("busy");
    let ok = 0;
    for (const slug of todo) {
      try {
        const { data, error } = await (supabase.rpc as any)("community_watch_home", { p_email: email, p_slug: slug });
        if (error || data?.error) continue;
        ok++; try { localStorage.setItem("rh_watch_" + slug, String(Date.now())); } catch { /* ignore */ }
      } catch { /* next */ }
    }
    try { localStorage.setItem("rh_watch_email", email); } catch { /* ignore */ }
    setState(ok ? "ok" : t("Something went wrong. Please try again."));
  }
  return (
    <section className="rh-watch rh-saved-watch" aria-label={t("Price alerts for saved homes")}>
      <div className="rh-watch-top">
        <Bell size={18} aria-hidden="true" />
        <div>
          <strong>{t(state === "ok" ? "Watching your saved homes" : "Tell me if any of these drops in price")}</strong>
          <small>{t(state === "ok" ? "If this is your first alert, confirm the email we sent you (check spam too)." : "One email per price drop. Free, and every email has a one-click unsubscribe.")}</small>
        </div>
        {state !== "ok" && !open && <button type="button" className="hunt-secondary" onClick={() => setOpen(true)}>{t("Watch all prices")}</button>}
      </div>
      {open && state !== "ok" && (
        <form className="rh-watch-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="rh-watch-all-email">{t("Email")}</label>
          <input id="rh-watch-all-email" type="email" required autoComplete="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="hunt-primary" disabled={state === "busy"}>{t(state === "busy" ? "Saving…" : "Email me")}</button>
          {state && state !== "busy" && <p role="alert" className="hunt-error-text">{state}</p>}
        </form>
      )}
    </section>
  );
}

/** Shown instead of an empty saved page: six of the best homes on RealHunt, so the page is never a dead end. */
export function SavedSuggestions() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    let on = true;
    loadRows().then((all) => {
      if (!on) return;
      const now = Date.now();
      const ok = all.filter((r: any) => r.image_urls?.[0] && r.price_eur && savedState(r, true, now) === "ok" && (!r.publish_at || Date.parse(r.publish_at) <= now));
      setRows(ok.sort((a: any, b: any) => (b.nota || 0) - (a.nota || 0)).slice(0, 6));
    }).catch(() => on && setRows([]));
    return () => { on = false; };
  }, []);
  if (!rows?.length) return null;
  return (
    <section className="rh-saved-suggest" aria-labelledby="rh-saved-suggest-h">
      <h2 id="rh-saved-suggest-h">{t("A good place to start")}</h2>
      <p className="hunt-fine">{t("Six of the best homes on RealHunt today. Tap the bookmark on any of them to keep it here.")}</p>
      <div className="hunt-small-grid rh-saved-grid">
        {rows.map((r) => (
          <Link className="hunt-mini" key={r.slug} to={`/deal/${encodeURIComponent(r.slug)}`}>
            <span className="rh-saved-img"><img src={thumb(r.image_urls[0])} alt={r.title} loading="lazy" decoding="async" onError={(e) => onThumbError(e.currentTarget, r.image_urls[0])} /></span>
            <div><strong>{money(r.price_eur)}</strong><h2>{r.title}</h2></div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------- shared list (list2 28)
// "Share this list" puts the saved homes in a link (/hunt/saved?homes=a,b,c). Nothing is stored on a server: whoever
// opens the link sees the same homes and can keep them in their own browser.
function ShareListButton({ slugs }: { slugs: string[] }) {
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) return; const id = setTimeout(() => setDone(false), 2500); return () => clearTimeout(id); }, [done]);
  const url = (typeof location !== "undefined" ? location.origin : "https://realhunt.co") + listHref(slugs);
  const go = async () => {
    try { (window as any).clarity?.("event", "saved_list_share"); } catch { /* blocked */ }
    try { if ((navigator as any).share && matchMedia("(pointer: coarse)").matches) { await (navigator as any).share({ title: t("My saved homes on RealHunt"), url }); return; } } catch { return; }
    try { await navigator.clipboard.writeText(url); setDone(true); } catch { window.prompt(t("Copy this link"), url); }
  };
  return <button type="button" className="hunt-secondary" onClick={go} aria-live="polite">{done ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />} {t(done ? "Link copied" : "Share this list")}</button>;
}

/** A list someone shared by link: the homes in their order, and one button to keep them all on this device. */
export function SharedList({ raw }: { raw: string }) {
  const slugs = parseList(raw);
  const [rows, setRows] = useState<any[] | null>(null);
  const [kept, setKept] = useState(false);
  useEffect(() => { let on = true; loadRows().then((r) => { if (on) setRows(slugs.map((s) => r.find((x: any) => x.slug === s)).filter(Boolean)); }).catch(() => on && setRows([])); return () => { on = false; }; }, [raw]);
  const items: SavedItem[] = (rows || []).map((d: any) => ({ id: d.id, slug: d.slug, title: d.title, price_eur: d.price_eur ?? null, image: d.image_urls?.[0] || null }));
  const keepAll = () => { for (const d of rows || []) if (!isGuestSaved(d.id)) toggleGuestSave(d); setKept(true); };
  return (
    <section className="rh-shared-list" aria-labelledby="rh-shared-h">
      <h2 id="rh-shared-h">{t("A list of homes shared with you")}</h2>
      {!rows ? <div className="rh-cmp-skel" aria-busy="true"><i /><i /></div> : !items.length ? <p>{t("These homes are no longer on RealHunt.")}</p> : <>
        <p className="hunt-fine">{items.length === 1 ? t("1 home") : `${items.length} ${t("homes")}`}{slugs.length > items.length ? ` · ${t("some homes in the link are no longer on RealHunt")}` : ""}</p>
        <div className="hunt-row"><button type="button" className="hunt-primary" onClick={keepAll} disabled={kept}>{kept ? <><Check size={16} aria-hidden="true" /> {t("Saved on this device")}</> : t("Save them all on this device")}</button></div>
        <SavedHomes items={items} share={false} />
      </>}
    </section>
  );
}

// ComparePage (its own lazy chunk) takes the helpers from here, so compareSaved.ts lives in this chunk only and is
// not merged into a chunk every page preloads (vite experimentalMinChunkSize joins small shared modules).
export { areaMedian, download, toCsv, vsMedian } from "./compareSaved";
