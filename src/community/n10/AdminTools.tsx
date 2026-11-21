// /hunt/admin, round n10 (21-nov-2026), loaded only on that page:
//  - ImportPreview (list2 77): every photo and the key facts of a pending home, with what is missing, before approving
//  - Unconfirmed (76): homes whose advert the nightly check could not confirm, longest first, with a hand check
//  - Portals (80): per portal, price / photos / what the check reads, and an alarm when a portal stops giving prices
//  - ChangeLog (79): price and status changes per home, from the published log (/research/removed-homes.json)
// The hand check and the probe figures use realhunt.community_admin_hand_check / community_admin_portal_health
// (supabase/migrations/20261121120000_admin_hand_check_portal_health.sql). Admin screens are in English only.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Check, History, Globe2, SearchCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "../api";
import { loadRows } from "../compareTools";
import { dayLabel } from "../n9/status";
import { changeLog } from "./HomeExtras";
import { importIssues, logByHome, portalStats, probeAlarms, unconfirmedQueue, type AdminRow, type ProbeStat } from "./logic";
import "./n10.css";

const rpc = (fn: string, args: Record<string, unknown> = {}) => (supabase.rpc as any)(fn, args).then(({ data, error }: any) => {
  if (error) throw new Error(/could not find|does not exist|schema cache/i.test(String(error.message)) ? "not-installed" : String(error.message || "Failed"));
  if (data?.error) throw new Error(String(data.error));
  return data;
});
const day = (iso?: string | null) => (iso ? dayLabel(iso, "en") : "never");

// ------------------------------------------------------------------------------------------ 77
export function ImportPreview({ d }: { d: any }) {
  const photos: string[] = (d.image_urls || []).filter(Boolean);
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const issues = importIssues(d);
  const nBroken = Object.keys(broken).length;
  const per = d.price_eur && d.sqm ? Math.round(d.price_eur / d.sqm) : null;
  return (
    <div className="n10-imp">
      {/* the first photo is already the big one above; the strip shows the others */}
      {photos.length > 1 ? (
        <div className="n10-imp-strip" role="list" aria-label={`${photos.length - 1} more photos`}>
          {photos.slice(1, 24).map((u, j) => { const i = j + 1; return (
            <a key={u + i} role="listitem" href={u} target="_blank" rel="noopener noreferrer" className={broken[i] ? "is-broken" : ""} title={broken[i] ? "This photo does not load" : `Photo ${i + 1}`}>
              {broken[i] ? <span>Broken</span> : <img src={u} alt={`Photo ${i + 1}`} loading="lazy" width={120} height={90} onError={() => setBroken((b) => ({ ...b, [i]: true }))} />}
            </a>); })}
        </div>
      ) : null}
      <dl className="n10-imp-facts">
        <div><dt>Price</dt><dd>{d.price_eur ? money(d.price_eur) : "missing"}</dd></div>
        <div><dt>Size</dt><dd>{d.sqm ? `${d.sqm} m²` : "missing"}{per ? <small> · {money(per)}/m²</small> : null}</dd></div>
        <div><dt>Bedrooms</dt><dd>{d.bedrooms ?? "missing"}</dd></div>
        <div><dt>Place</dt><dd>{[d.location_name, d.country].filter(Boolean).join(", ") || "missing"}</dd></div>
        <div><dt>Photos</dt><dd>{photos.length}{nBroken ? <small> · {nBroken} broken</small> : null}</dd></div>
      </dl>
      {issues.length + nBroken > 0
        ? <ul className="n10-imp-issues">{issues.map((x) => <li key={x}><AlertTriangle size={13} aria-hidden="true" /> {x}</li>)}{nBroken > 0 && <li><AlertTriangle size={13} aria-hidden="true" /> {nBroken} photo{nBroken === 1 ? "" : "s"} do not load</li>}</ul>
        : <p className="n10-imp-ok"><Check size={14} aria-hidden="true" /> Price, size, bedrooms, place, photos and advert link are all there.</p>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ shared rows
function useRows(): AdminRow[] | null {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  useEffect(() => { let on = true; loadRows().then((r) => { if (on) setRows(r as AdminRow[]); }).catch(() => on && setRows([])); return () => { on = false; }; }, []);
  return rows;
}

// ------------------------------------------------------------------------------------------ 76
function Unconfirmed({ rows }: { rows: AdminRow[] }) {
  const list = useMemo(() => unconfirmedQueue(rows), [rows]);
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [all, setAll] = useState(false);
  async function hand(r: AdminRow, verdict: "ok" | "gone") {
    const note = window.prompt(verdict === "ok" ? "What did you see? (stored with the reading)" : "What did you see? One 'removed' reading; a second one on another day marks the home as no longer for sale.", verdict === "ok" ? "Advert online, same price" : "Advert removed");
    if (note === null) return;
    setBusy(r.slug || ""); setMsg("");
    try { await rpc("community_admin_hand_check", { p_deal: r.id, p_verdict: verdict, p_note: note }); setDone((d) => ({ ...d, [r.slug || ""]: verdict })); }
    catch (e) { setMsg((e as Error).message === "not-installed" ? "The hand check is not switched on yet: the database function community_admin_hand_check still has to be installed (migration 20261121120000)." : (e as Error).message); }
    finally { setBusy(""); }
  }
  const shown = all ? list : list.slice(0, 30);
  return (
    <details className="n10-adm" open>
      <summary><SearchCheck size={17} aria-hidden="true" /> Homes not confirmed online ({list.length})</summary>
      <p className="n10-fine">The nightly check could not find these adverts online in the last 30 days (portal blocks it, error, or social post). Longest first. Open the advert, then record what you saw. The page notice goes away after the next daily snapshot.</p>
      {msg && <p role="alert" className="hunt-error-text">{msg}</p>}
      {!list.length ? <p>Every advert was confirmed in the last 30 days.</p> : (
        <ol className="n10-adm-list">
          {shown.map((r) => (
            <li key={r.slug}>
              <div>
                <Link to={`/deal/${r.slug}`}>{r.title || r.slug}</Link>
                <small>{[r.source_domain || "no portal", r.country, r.price_eur ? money(r.price_eur) : ""].filter(Boolean).join(" · ")}</small>
                <small>{r.never ? `Never confirmed online · on RealHunt ${r.days ?? "?"} days` : `Last online ${day(r.src_ok_at)} · ${r.days} days ago`} · last reading: {r.src_last || "none"}</small>
              </div>
              <div className="n10-adm-act">
                {r.source_url && /^https?:\/\//.test(r.source_url) ? <a className="hunt-secondary" href={r.source_url} target="_blank" rel="noopener noreferrer">Advert <ArrowUpRight size={14} aria-hidden="true" /></a> : <Link className="hunt-secondary" to={`/deal/${r.slug}`}>Home page</Link>}
                {done[r.slug || ""] ? <span className="n10-adm-done"><Check size={14} aria-hidden="true" /> {done[r.slug || ""] === "ok" ? "Recorded online" : "Recorded removed"}</span> : <>
                  <button type="button" className="hunt-primary" disabled={!!busy} onClick={() => hand(r, "ok")}>Online</button>
                  <button type="button" disabled={!!busy} onClick={() => hand(r, "gone")}>Removed</button>
                </>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {list.length > 30 && !all && <button type="button" className="hunt-link" onClick={() => setAll(true)}>Show all {list.length}</button>}
    </details>
  );
}

// ------------------------------------------------------------------------------------------ 80
function Portals({ rows }: { rows: AdminRow[] }) {
  const stats = useMemo(() => portalStats(rows), [rows]);
  const [probes, setProbes] = useState<ProbeStat[] | null | "off">(null);
  useEffect(() => { rpc("community_admin_portal_health", { p_days: 7 }).then((d) => setProbes(Array.isArray(d?.portals) ? d.portals : [])).catch(() => setProbes("off")); }, []);
  const by = new Map((Array.isArray(probes) ? probes : []).map((p) => [p.domain, p]));
  const alarms = Array.isArray(probes) ? probes.map((p) => [p, probeAlarms(p)] as const).filter(([, a]) => a.length) : [];
  const warned = stats.filter((s) => s.warn.length).length + alarms.length;
  return (
    <details className="n10-adm">
      <summary><Globe2 size={17} aria-hidden="true" /> Portals ({stats.length}){warned ? <b className="n10-adm-warn"> {warned} to look at</b> : null}</summary>
      {alarms.length > 0 && <ul className="n10-imp-issues">{alarms.map(([p, a]) => <li key={p.domain}><AlertTriangle size={13} aria-hidden="true" /> {p.domain}: {a.map((x) => x === "price_stopped" ? `the nightly check stopped reading the price (${p.prev_ok_price} of ${p.prev_ok} online readings had one the week before, ${p.ok_price} of ${p.ok} this week)` : `now blocks the nightly check (${p.blocked} of ${p.ok + p.blocked} readings this week)`).join("; ")}</li>)}</ul>}
      {probes === "off" && <p className="n10-fine">Weekly readings per portal need the database function community_admin_portal_health (migration 20261121120000). Until it is installed, this table shows the daily snapshot only.</p>}
      <div className="n10-adm-table" tabIndex={0}>
        <table className="hunt-table">
          <thead><tr><th>Portal</th><th>Homes</th><th>With price</th><th>With photos</th><th>Last check</th><th>Last online</th>{Array.isArray(probes) && <th>Price read (7 days)</th>}<th></th></tr></thead>
          <tbody>
            {stats.map((s) => { const p = by.get(s.domain); return (
              <tr key={s.domain} className={s.warn.length ? "is-warn" : ""}>
                <td>{s.domain}</td><td>{s.homes}</td><td>{s.price}</td><td>{s.photos}</td>
                <td><small>{s.ok} online · {s.blocked} blocked · {s.gone} removed{s.error ? ` · ${s.error} error` : ""}{s.none ? ` · ${s.none} none` : ""}</small></td>
                <td>{day(s.lastOk)}</td>
                {Array.isArray(probes) && <td>{p ? `${p.ok_price} of ${p.ok}` : "-"}</td>}
                <td>{s.warn.map((w) => <span key={w} className="n10-adm-chip">{w === "price" ? "few prices" : w === "photos" ? "few photos" : "check blocked"}</span>)}</td>
              </tr>); })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ------------------------------------------------------------------------------------------ 79
function ChangeLog() {
  const [events, setEvents] = useState<Awaited<ReturnType<typeof changeLog>> | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => { changeLog().then(setEvents); }, []);
  const homes = useMemo(() => logByHome(events, q), [events, q]);
  const label = (k: string) => (k === "price" ? "price" : k === "gone" ? "marked no longer for sale" : k === "removed" ? "taken off RealHunt" : k === "back" ? "back on sale" : k);
  return (
    <details className="n10-adm">
      <summary><History size={17} aria-hidden="true" /> Price and status changes ({homes.length} homes)</summary>
      <p className="n10-fine">From the published log (since 24 Oct 2026, updated with every build). <Link to="/research/data-changelog">Public page</Link></p>
      <label className="hunt-crm-search"><input type="search" aria-label="Search the change log" placeholder="Home title or slug" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {!events ? <p>Loading…</p> : (
        <ol className="n10-adm-list">
          {homes.slice(0, 60).map((h) => (
            <li key={h.slug}>
              <div>
                <Link to={`/deal/${h.slug}`}>{h.title}</Link>
                {h.events.map((e, i) => <small key={i}>{day(e.date)}: {label(e.kind)}{e.kind === "price" && e.old_price_eur && e.price_eur ? ` ${money(e.old_price_eur)} → ${money(e.price_eur)}` : e.price_eur ? ` at ${money(e.price_eur)}` : ""}</small>)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

export default function AdminTools() {
  const rows = useRows();
  if (!rows) return <p className="n10-fine">Loading the homes…</p>;
  return (
    <section className="n10-adm-wrap" aria-label="Checks and data">
      <h2>Checks and data</h2>
      <Unconfirmed rows={rows} />
      <Portals rows={rows} />
      <ChangeLog />
    </section>
  );
}
