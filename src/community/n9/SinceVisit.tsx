// "New since your last visit" on the home feed (15-nov-2026). Shown only to someone who has been here before and
// only when homes were published since then; the count is the real number of homes in today's list with a
// publication date after the start of that earlier visit (kept in this browser, see visit.ts).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { feedAll, type Row } from "../extras";
import { thumb } from "@/lib/thumbs";
import { t, getLang } from "../i18n";
import { returningSince, newSince } from "./visit";
import { dayLabel } from "./status";
import { loadRows } from "../compareTools";
import { useCommunity } from "../ctx";
import { guestSaves } from "../guestSaves";
import { savedPrices } from "../savedPrice";
import "./n9.css";

/** list 867 (26-nov-2026): saved homes that are cheaper now than when they were saved, first thing on the feed. */
function SavedDrops() {
  const { session } = useCommunity();
  const [n, setN] = useState(0);
  const ids = (session?.saved?.length ? session.saved : guestSaves().map((g) => g.id)).join(",");
  useEffect(() => {
    if (!ids) { setN(0); return; }
    let live = true;
    const want = new Set(ids.split(","));
    const then = savedPrices();
    loadRows().then((rows) => {
      if (!live) return;
      setN(rows.filter((r: any) => want.has(r.id) && then[r.slug]?.p && r.price_eur && r.price_eur < then[r.slug].p).length);
    }).catch(() => {});
    return () => { live = false; };
  }, [ids]);
  if (!n) return null;
  return (
    <div className="n9-since n9-since-saved" role="status">
      <span><strong>{n === 1 ? t("1 saved home") : t(`${n} saved homes`)}</strong>{" "}{t(n === 1 ? "is cheaper than when you saved it" : "are cheaper than when you saved them")}</span>
      <Link className="hunt-link" to="/hunt/saved" onClick={() => { try { (window as any).clarity?.("event", "since_visit_saved"); } catch { /* blocked */ } }}>{t("See saved homes")}</Link>
    </div>
  );
}

/** `country` (21-nov-2026, list2 44): only the homes of that country, for the country listing pages and the feed
 * filtered to one country. */
export default function SinceVisit({ country }: { country?: string }) {
  const prev = returningSince();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { if (prev == null) return; let live = true; feedAll({ sort: "new", ...(country ? { country } : {}) }).then((f) => { if (live) setRows(newSince(f.rows, prev)); }).catch(() => { if (live) setRows([]); }); return () => { live = false; }; }, [prev, country]);
  if (prev == null || !rows) return prev == null ? null : <SavedDrops />;
  const when = dayLabel(new Date(prev).toISOString(), getLang() === "es" ? "es" : "en");
  const n = rows.length;
  if (!n) return (<>
    <SavedDrops />
    <div className="n9-since" role="status">
      <span>{t(`No new homes since your last visit on ${when}.`)}</span>
      <Link className="hunt-link" to={country ? `/alerts?country=${encodeURIComponent(country)}` : "/alerts"}>{t("Get an email when new homes arrive")}</Link>
    </div>
  </>);
  return (<>
    <SavedDrops />
    <div className="n9-since" role="status">
      <span><strong>{n === 1 ? t("1 new home") : t(`${n} new homes`)}</strong>{" "}{t(`since your last visit on ${when}`)}</span>
      <Link className="hunt-link" to={country ? `/?country=${encodeURIComponent(country)}&order=new` : "/?order=new"} onClick={() => { try { (window as any).clarity?.("event", "since_visit_open"); } catch { /* blocked */ } }}>{t("See the newest first")}</Link>
      <span className="n9-since-thumbs" aria-hidden="true">
        {rows.slice(0, 3).filter((r) => r.image_urls?.[0]).map((r) => <Link key={r.id} to={`/deal/${encodeURIComponent(r.slug)}`} tabIndex={-1}><img src={thumb(r.image_urls![0])} alt="" width={56} height={44} loading="lazy" decoding="async" /></Link>)}
      </span>
    </div>
  </>);
}
