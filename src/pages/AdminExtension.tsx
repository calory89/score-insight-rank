// 9-oct-2026 (Carlos): /admin/extension — who uses the RealHunt Score extension, their emails and what they look at.
// Data comes from security-definer RPCs that only answer to users with the admin role.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;
type Row = {
  user_id: string; email: string | null; email_verified_at: string | null; phone: string | null; marketing_ok: boolean | null; lang: string | null;
  created_at: string; last_seen_at: string | null; views: number; saves: number; median_price: number | null; p25_price: number | null; p75_price: number | null;
  median_sqm: number | null; top_areas: string[] | null; countries: string[] | null; ptypes: string[] | null; currency: string | null;
  budget: number | null; places: string[] | null; pref_type: string | null; purpose: string | null; timeline: string | null;
};
type Stats = { users: number; emails: number; verified: number; marketing_ok: number; active_7d: number; views_7d: number; listings: number;
  top_areas: { area: string; country: string; n: number }[] | null; by_day: { d: string; views: number; signups: number; installs: number }[] | null };

const money = (n: number | null, c: string | null) => (n == null ? "" : ({ EUR: "€", GBP: "£", USD: "$" } as any)[c || "EUR"] + Math.round(n).toLocaleString("en-GB"));
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "");
const csvCell = (v: unknown) => { const s = Array.isArray(v) ? v.join(" | ") : v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default function AdminExtension() {
  const { user } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [onlyEmail, setOnlyEmail] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => { document.title = "Admin · RealHunt Score extension"; }, []);
  useEffect(() => {
    if (!user) { setOk(false); return; }
    db.rpc("ext_is_admin").then(({ data }: any) => setOk(!!data));
  }, [user]);
  useEffect(() => {
    if (!ok) return;
    db.rpc("ext_admin_stats").then(({ data, error }: any) => (error ? setErr(error.message) : setStats(data)));
  }, [ok]);
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => {
      db.rpc("ext_admin_users", { p_q: q || null, p_only_email: onlyEmail, p_limit: 1000, p_offset: 0 }).then(({ data, error }: any) => (error ? setErr(error.message) : setRows(data || [])));
    }, 250);
    return () => clearTimeout(t);
  }, [ok, q, onlyEmail]);

  const csv = useMemo(() => {
    const cols: (keyof Row)[] = ["email", "email_verified_at", "marketing_ok", "phone", "lang", "created_at", "last_seen_at", "views", "saves", "median_price", "p25_price", "p75_price", "currency", "median_sqm", "top_areas", "countries", "ptypes", "budget", "places", "pref_type", "purpose", "timeline"];
    return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  }, [rows]);
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `realhunt-score-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };

  if (ok === null) return <div className="hunt-wrap xa-page"><p>Loading…</p></div>;
  if (!ok) return <div className="hunt-wrap xa-page"><h1>Admin only</h1><p>Sign in with an admin account. <Link to="/">Back</Link></p></div>;
  const max = Math.max(1, ...(stats?.by_day || []).map((d) => d.views));
  return (
    <div className="hunt-wrap xa-page">
      <p className="xa-crumb"><Link to="/admin/activity">Admin</Link> · RealHunt Score extension</p>
      <h1>Extension users</h1>
      {err && <p className="xa-err">{err}</p>}
      {stats && (
        <div className="xa-tiles">
          {[["Users (consented)", stats.users], ["Emails", stats.emails], ["Verified emails", stats.verified], ["OK to email", stats.marketing_ok], ["Active 7 days", stats.active_7d], ["Homes viewed 7 days", stats.views_7d], ["Homes in comps DB", stats.listings]].map(([k, v]) => (
            <div key={k as string}><b>{Number(v || 0).toLocaleString("en-GB")}</b><span>{k}</span></div>
          ))}
        </div>
      )}
      {stats?.by_day && stats.by_day.length > 0 && (
        <div className="xa-chart" aria-label="Homes viewed per day, last 30 days">
          {stats.by_day.map((d) => <div key={d.d} title={`${d.d}: ${d.views} views, ${d.signups} sign-ups, ${d.installs} installs`}><i style={{ height: `${Math.round((d.views / max) * 100)}%` }} /></div>)}
        </div>
      )}
      {stats?.top_areas && stats.top_areas.length > 0 && (
        <p className="xa-areas"><b>Most viewed areas (30 days):</b> {stats.top_areas.map((a) => `${a.area}${a.country ? " (" + a.country + ")" : ""} ${a.n}`).join(" · ")}</p>
      )}
      <div className="xa-tools">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or area" />
        <label><input type="checkbox" checked={onlyEmail} onChange={(e) => setOnlyEmail(e.target.checked)} /> Only with email</label>
        <button onClick={download} disabled={!rows.length}>Download CSV ({rows.length})</button>
      </div>
      <div className="xa-table">
        <table>
          <thead><tr><th>Email</th><th>OK to email</th><th>Last seen</th><th>Views</th><th>Saves</th><th>Price they look at</th><th>m²</th><th>Areas</th><th>Type</th><th>Profile</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td>{r.email || <i>anonymous</i>}{r.email && !r.email_verified_at ? " (unverified)" : ""}{r.phone ? <small><br />{r.phone}</small> : null}</td>
                <td>{r.marketing_ok ? "yes" : "no"}</td>
                <td>{day(r.last_seen_at)}</td>
                <td>{r.views}</td>
                <td>{r.saves}</td>
                <td>{r.median_price ? `${money(r.median_price, r.currency)}` : ""}{r.p25_price ? <small><br />{money(r.p25_price, r.currency)}–{money(r.p75_price, r.currency)}</small> : null}</td>
                <td>{r.median_sqm ? Math.round(r.median_sqm) : ""}</td>
                <td>{(r.top_areas || []).join(", ")}{r.countries?.length ? <small><br />{r.countries.join(", ")}</small> : null}</td>
                <td>{(r.ptypes || []).join(", ")}</td>
                <td><small>{[r.budget ? "≤" + money(r.budget, "EUR") : "", (r.places || []).join("/"), r.pref_type, r.purpose, r.timeline].filter(Boolean).join(" · ")}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hunt-fine">Only people who accepted the extension's privacy terms appear here. Email only those marked “OK to email”; everyone else can only get the account emails they asked for.</p>
    </div>
  );
}
