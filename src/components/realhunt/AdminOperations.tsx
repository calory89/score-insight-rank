import {ListingQuality,QualityMetrics} from "@/community/OperationsTools";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, eur } from "@/lib/rh";
import { saveChange, fetchAll, downloadCsv } from "@/lib/platform";
import Pagination from "./Pagination";

export default function AdminOperations({ contactsOnly = false }: { contactsOnly?: boolean }) {
  const [vitals, setVitals] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { setPage(0); }, [query]);
  useEffect(() => {
    let active = true; setBusy(true); setError(false);
    const t = setTimeout(async () => {
      try {
        const res = contactsOnly ? await db.rpc("admin_contacts_page", { p_query: query, p_offset: page * 50, p_limit: 50 }) : await db.rpc("admin_platform_health");
        if (!active) return;
        if (res.error) throw res.error;
        if (contactsOnly) { setContacts(res.data.rows); setTotal(res.data.total); } else { setHealth(res.data); const metrics = await db.rpc("admin_web_vitals"); if (active && !metrics.error) setVitals(metrics.data || []); }
      } catch { if (active) setError(true); } finally { if (active) setBusy(false); }
    }, contactsOnly ? 250 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [contactsOnly, query, page, revision]);
  const exportAll = async () => {
    setBusy(true);
    const r = await saveChange(async () => ({ data: await fetchAll<any>(async (from,to) => {
      const res = await db.rpc("admin_contacts_page", { p_query: query, p_offset: from, p_limit: to - from + 1 });
      return { error: res.error, data: res.data?.rows, count: res.data?.total };
    }) }));
    setBusy(false);
    if (r.ok) downloadCsv("realhunt-all-contacts.csv", [["email","first_seen_utc","last_seen_utc","sources","captures"], ...r.data.map(c => [c.email,c.first_seen,c.last_seen,c.sources.join(" | "),c.captures])]);
  };
  if (error) return <div role="alert" className="p-5 border border-red-300 rounded-xl">Could not load this dashboard. <button onClick={() => setRevision(n => n + 1)} className="underline min-h-11">Retry</button></div>;
  if (contactsOnly) return <section className="space-y-4"><div><h2 className="font-display text-2xl">All captured contacts</h2><p className="text-sm text-ink-muted mt-1">Registrations, profiles, newsletter, requests, alerts, developers, submissions, agents and imported CRM/outreach contacts. One row per email; all capture sources are retained. This is not a marketing consent list.</p></div>
    <div className="flex flex-wrap gap-3"><input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search all captured emails" placeholder="Search every email" className="flex-1 min-w-48 border border-hairline rounded-xl px-4 h-12" /><button disabled={busy} onClick={exportAll} className="rh-btn-primary disabled:opacity-50">Export all matches</button></div>
    {busy && <p role="status" className="text-sm">Loading…</p>}
    <div className="overflow-auto border border-hairline rounded-xl bg-white"><table className="w-full text-sm text-left"><thead><tr>{["Email","Sources","First captured","Last captured","Captures"].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>{contacts.map(c => <tr key={c.email} className="border-t border-hairline"><td className="p-3">{c.email}</td><td className="p-3">{c.sources.join(", ")}</td><td className="p-3 whitespace-nowrap">{new Date(c.first_seen).toLocaleString()}</td><td className="p-3 whitespace-nowrap">{new Date(c.last_seen).toLocaleString()}</td><td className="p-3">{c.captures}</td></tr>)}</tbody></table></div>
    {!busy && !contacts.length && <p>No contacts match this search.</p>}<Pagination page={page} total={total} onChange={setPage} busy={busy} />
  </section>;
  if (!health) return <p role="status">Loading operations…</p>;
  const cards: [string, string, string][] = [["pending_developers","Developers awaiting review","/admin/activity/network"],["uncontacted_buyers","Buyer requests to contact","/admin/activity#requests"],["overdue_followups","Overdue buyer follow-ups","/admin/activity/network"],["pending_submissions","Homes awaiting review","/admin/activity#submissions"],["email_failures_24h","Unresolved email failures · 24h","/admin/activity/operations#email-health"],["bounces_24h","Bounces or complaints · 24h","/admin/activity/operations#email-health"],["email_queue_pending","Emails not marked sent","/admin/activity/operations#email-health"],["unverified_homes","Homes awaiting verification","/admin/activity#listing-review"]];
  return <section className="space-y-6"><ListingQuality/><QualityMetrics/><div className="flex justify-between gap-3"><div><h2 className="font-display text-2xl">Operations</h2><p className="text-sm text-ink-muted">Live totals across the database. Open a queue to act.</p></div><button disabled={busy} onClick={() => setRevision(n => n + 1)} className="underline text-sm">Refresh</button></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{cards.map(([key,label,to]) => <Link key={key} to={to} className="border border-hairline rounded-2xl p-5 bg-white hover:border-ink"><p className="font-display text-3xl tabular-nums">{health[key]}</p><p className="mt-2 text-sm text-ink-muted">{label} →</p></Link>)}</div>
    <div className="border border-hairline rounded-2xl p-5 grid sm:grid-cols-3 gap-4 bg-white">{[[health.registrations,"Registered accounts"],[health.confirmed_registrations,"Email-confirmed accounts"],[health.subscribers,"Newsletter records"],[eur(health.commission_due),"Commission awaiting payment"]].map(([value,label]) => <div key={label}><b className="text-xl">{value}</b><p className="text-sm text-ink-muted">{label}</p></div>)}</div>
    <div className="border border-hairline rounded-2xl p-5 bg-white"><h3 className="font-medium">Real-user speed · last 28 days</h3><p className="text-sm text-ink-muted mt-1">75th percentile, separated by device. Targets: LCP ≤ 2,500 ms · INP ≤ 200 ms · CLS ≤ 0.1. Consent-based sample; this is not a laboratory score.</p>{!vitals.length ? <p className="text-sm mt-3">Waiting for measurements from real visits.</p> : <div className="flex flex-wrap gap-4 mt-4">{vitals.map(v => <div key={v.device + v.metric} className="border border-hairline rounded-xl p-3"><p className="text-xs uppercase">{v.device} · {v.metric}</p><b className="text-xl">{Number(v.p75).toFixed(v.metric === "CLS" ? 3 : 0)}{v.metric === "CLS" ? "" : " ms"}</b><p className="text-xs text-ink-muted">{v.samples} samples{v.samples < 20 ? " · limited data" : ""}</p></div>)}</div>}</div>
    <div id="email-health" className="border border-hairline rounded-2xl p-5 text-sm"><h3 className="font-medium">Email & measurement health</h3><p className="mt-2">Sent means accepted by the email provider. It does not prove inbox delivery. Failed attempts with a later successful retry are excluded from unresolved failures.</p><p className="mt-2">Latest consented analytics event: {health.last_event ? new Date(health.last_event).toLocaleString() : "No events recorded yet"}. Analytics resumed with this release; historical gaps are not reconstructed.</p><Link to="/admin/activity/contacts" className="inline-block underline mt-3 min-h-11">Search every captured email →</Link></div>
  </section>;
}
