import { useEffect, useMemo, useState } from "react";
import { Download, Mail } from "lucide-react";
import { db } from "@/lib/rh";

type S = { id: string; email: string; source: string | null; path: string | null; tz: string | null; country: string | null; status: string; created_at: string; welcome_sent_at: string | null; meta: any };

const AdminSubscribers = () => {
  const [rows, setRows] = useState<S[]>([]);
  const [shows, setShows] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("all");
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  useEffect(() => {
    db.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }).limit(2000).then(({ data }: any) => setRows(data || []));
    db.from("rh_events").select("event,meta,sid").in("event", ["capture_show", "capture_dismiss", "newsletter"]).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(20000).then(({ data }: any) => {
      const m: Record<string, Set<string>> = {};
      (data || []).forEach((e: any) => { const k = e.event + ":" + (e.meta?.kind || e.meta?.source || "other"); (m[k] = m[k] || new Set()).add(e.sid); });
      const o: Record<string, number> = {}; Object.entries(m).forEach(([k, v]) => (o[k] = v.size)); setShows(o);
    });
  }, []);

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.source || "unknown"))), [rows]);
  const shown = rows.filter((r) => (src === "all" || (r.source || "unknown") === src) && (!q || r.email.includes(q.toLowerCase()) || (r.path || "").includes(q)));
  const daily = useMemo(() => { const m: Record<string, number> = {}; rows.forEach((r) => { const d = r.created_at.slice(5, 10); m[d] = (m[d] || 0) + 1; }); return Object.entries(m).sort().slice(-14).map(([d, n]) => ({ d, n })); }, [rows]);
  const today = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
  const week = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length;
  const rate = (kind: string) => { const s = shows["capture_show:" + kind] || 0; const c = shows["newsletter:" + (kind === "banner" ? "banner" : "popup")] || 0; return s ? `${((c / s) * 100).toFixed(1)}% of ${s}` : "—"; };

  const exportCsv = () => {
    const head = ["when", "email", "source", "page", "timezone", "status", "welcome_sent"];
    const csv = [head, ...shown.map((r) => [r.created_at, r.email, r.source, r.path, r.tz, r.status, r.welcome_sent_at])].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, "'")}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "realhunt-subscribers.csv"; a.click();
  };
  const setStatus = async (r: S, status: string) => { await db.from("newsletter_subscribers").update({ status }).eq("id", r.id); setRows(rows.map((x) => (x.id === r.id ? { ...x, status } : x))); };

  const Th = ({ c }: { c: string }) => <th className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-muted font-medium px-3 py-2 border-b border-hairline whitespace-nowrap">{c}</th>;
  const Td = ({ c, m }: { c: React.ReactNode; m?: boolean }) => <td className={`px-3 py-2 border-b border-hairline/70 text-[13px] align-top ${m ? "text-ink-muted" : ""}`}>{c}</td>;
  const K = ({ n, l }: { n: React.ReactNode; l: string }) => <div className="border border-hairline rounded-xl bg-white px-4 py-3 min-w-[120px]"><b className="font-display text-[24px] block leading-none">{n}</b><span className="text-[12px] text-ink-muted">{l}</span></div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        <K n={rows.length} l="subscribers" /><K n={today} l="last 24 h" /><K n={week} l="last 7 days" />
        <K n={rate("banner")} l="banner conversion, 30 d" /><K n={rate("popup")} l="popup conversion, 30 d" />
        <K n={rows.filter((r) => r.welcome_sent_at).length} l="got the top 10 email" />
      </div>

      <section>
        <h2 className="font-display text-[20px] tracking-tight mb-3">New subscribers per day</h2>
        <div className="flex items-end gap-1 h-24 border border-hairline rounded-xl bg-white p-3">{daily.map((x) => { const mx = Math.max(1, ...daily.map((y) => y.n)); return <div key={x.d} className="flex-1 flex flex-col items-center gap-1" title={`${x.d}: ${x.n}`}><div className="w-full bg-emerald-500 rounded-t" style={{ height: `${Math.max(4, (x.n / mx) * 64)}px` }} /><span className="text-[9px] text-ink-muted">{x.d.slice(3)}</span></div>; })}{daily.length === 0 && <span className="text-[13px] text-ink-muted">Nothing yet.</span>}</div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Mail size={18} /> Emails collected</h2>
          <span className="flex-1" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search email or page" className="border border-hairline rounded-full px-3 py-1.5 text-[13px] bg-white" />
          <select value={src} onChange={(e) => setSrc(e.target.value)} className="border border-hairline rounded-full px-3 py-1.5 text-[13px] bg-white"><option value="all">all sources</option>{sources.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <button onClick={exportCsv} className="px-3 py-1.5 rounded-full border border-hairline bg-white text-[12px] inline-flex items-center gap-1"><Download size={12} /> CSV</button>
        </div>
        <div className="overflow-x-auto border border-hairline rounded-xl bg-white"><table className="w-full border-collapse"><thead><tr><Th c="When" /><Th c="Email" /><Th c="Source" /><Th c="Page" /><Th c="Timezone" /><Th c="Top 10 sent" /><Th c="Status" /></tr></thead><tbody>
          {shown.map((r) => <tr key={r.id}><Td c={fmt(r.created_at)} m /><Td c={<a href={`mailto:${r.email}`} className="underline">{r.email}</a>} /><Td c={<span className={`px-2 py-0.5 rounded-full text-[11px] ${r.source === "popup" ? "bg-amber-100 text-amber-800" : r.source === "banner" ? "bg-sky-100 text-sky-800" : "bg-hairline/60"}`}>{r.source || "unknown"}</span>} /><Td c={r.path || ""} m /><Td c={r.tz || ""} m /><Td c={r.welcome_sent_at ? "yes" : "—"} m /><Td c={<select value={r.status} onChange={(e) => setStatus(r, e.target.value)} className="border border-hairline rounded-lg px-2 py-1 text-[12px] bg-paper">{["active", "contacted", "customer", "unsubscribed", "bounced"].map((s) => <option key={s}>{s}</option>)}</select>} /></tr>)}
          {shown.length === 0 && <tr><Td c="No subscribers yet." m /></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
};
export default AdminSubscribers;
