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
import "./n9.css";

/** `country` (21-nov-2026, list2 44): only the homes of that country, for the country listing pages and the feed
 * filtered to one country. */
export default function SinceVisit({ country }: { country?: string }) {
  const prev = returningSince();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { if (prev == null) return; let live = true; feedAll({ sort: "new", ...(country ? { country } : {}) }).then((f) => { if (live) setRows(newSince(f.rows, prev)); }).catch(() => { if (live) setRows([]); }); return () => { live = false; }; }, [prev, country]);
  if (prev == null || !rows) return null;
  const when = dayLabel(new Date(prev).toISOString(), getLang() === "es" ? "es" : "en");
  const n = rows.length;
  if (!n) return (
    <div className="n9-since" role="status">
      <span>{t(`No new homes since your last visit on ${when}.`)}</span>
      <Link className="hunt-link" to={country ? `/alerts?country=${encodeURIComponent(country)}` : "/alerts"}>{t("Get an email when new homes arrive")}</Link>
    </div>
  );
  return (
    <div className="n9-since" role="status">
      <span><strong>{n === 1 ? t("1 new home") : t(`${n} new homes`)}</strong>{" "}{t(`since your last visit on ${when}`)}</span>
      <Link className="hunt-link" to={country ? `/?country=${encodeURIComponent(country)}&order=new` : "/?order=new"} onClick={() => { try { (window as any).clarity?.("event", "since_visit_open"); } catch { /* blocked */ } }}>{t("See the newest first")}</Link>
      <span className="n9-since-thumbs" aria-hidden="true">
        {rows.slice(0, 3).filter((r) => r.image_urls?.[0]).map((r) => <Link key={r.id} to={`/deal/${encodeURIComponent(r.slug)}`} tabIndex={-1}><img src={thumb(r.image_urls![0])} alt="" width={56} height={44} loading="lazy" decoding="async" /></Link>)}
      </span>
    </div>
  );
}
