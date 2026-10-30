import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, FlaskConical, Trophy, Eye, RefreshCw } from "lucide-react";

const db = supabase as any;
type Variant = { id: string; label?: string; text?: string; weight?: number };
type Exp = { key: string; name: string; page: string; kind: string; variants: Variant[]; goals: string[]; active: boolean; notes: string | null };
type Res = Record<string, { variants: Record<string, number>; goals: Record<string, Record<string, number>>; daily: { d: string; n: number }[] }>;
const GOAL_LABEL: Record<string, string> = { network_analyze: "Pasted a project", network_lead: "Left email", network_share_yes: "Wants to share leads", devapp_register: "Created panel", agreement_signed: "Signed agreement", card_click: "Opened a home", favorite: "Saved a home", fav_gate: "Hit save gate", alert: "Set an alert", newsletter: "Newsletter", home_view: "Home view" };
const ALL_GOALS = Object.keys(GOAL_LABEL);
const pct = (n: number, d: number) => (d ? (100 * n) / d : 0);
// two-proportion z-test, one-sided "b better than a"; returns confidence 0..1
const conf = (ca: number, na: number, cb: number, nb: number) => { if (!na || !nb) return 0; const pa = ca / na, pb = cb / nb, p = (ca + cb) / (na + nb); const se = Math.sqrt(p * (1 - p) * (1 / na + 1 / nb)); if (!se) return 0; const z = (pb - pa) / se; const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const pr = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - pr : pr; };
const inp = "border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper w-full";

const AdminExperiments = () => {
  const [exps, setExps] = useState<Exp[] | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [days, setDays] = useState(30);
  const [excludeDk, setExcludeDk] = useState(true);
  const [editing, setEditing] = useState<Exp | null>(null);
  const [busy, setBusy] = useState(false);
  const [goalPick, setGoalPick] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: e }, { data: r }] = await Promise.all([db.from("experiments").select("*").order("created_at"), db.rpc("admin_experiments", { p_days: days, p_exclude_tz: excludeDk ? ["Europe/Copenhagen"] : [] })]);
    setExps(e || []); setRes(r || {});
  };
  useEffect(() => { load(); }, [days, excludeDk]);

  const save = async () => { if (!editing) return; setBusy(true); const row = { ...editing, key: editing.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_"), variants: editing.variants.filter((v) => v.id.trim()), updated_at: new Date().toISOString() }; await db.from("experiments").upsert(row); setBusy(false); setEditing(null); load(); };
  const toggle = async (e: Exp) => { await db.from("experiments").update({ active: !e.active, updated_at: new Date().toISOString() }).eq("key", e.key); load(); };
  const remove = async (e: Exp) => { if (!confirm(`Delete experiment ${e.key}? Results stay in the events log.`)) return; await db.from("experiments").delete().eq("key", e.key); load(); };
  const blank = (): Exp => ({ key: "", name: "", page: "/network", kind: "text", variants: [{ id: "A", label: "Control", text: "" }, { id: "B", label: "", text: "" }], goals: ["network_analyze"], active: false, notes: "" });

  const totals = useMemo(() => { if (!res) return { visitors: 0, live: 0 }; let visitors = 0; Object.values(res).forEach((r) => { visitors += Object.values(r.variants).reduce((a, b) => a + b, 0); }); return { visitors, live: (exps || []).filter((e) => e.active).length }; }, [res, exps]);

  if (!exps || !res) return <p className="text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading experiments…</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[14px]"><b className="font-display text-[22px]">{totals.live}</b> <span className="text-ink-muted">live experiments</span></span>
        <span className="text-[14px]"><b className="font-display text-[22px]">{totals.visitors}</b> <span className="text-ink-muted">exposures counted</span></span>
        <span className="flex-1" />
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={excludeDk} onChange={(e) => setExcludeDk(e.target.checked)} /> Exclude Denmark (your own visits)</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border border-hairline rounded-full px-3 py-1.5 text-[13px] bg-white">{[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>last {d} days</option>)}</select>
        <button onClick={load} className="px-3 py-1.5 rounded-full border border-hairline bg-white text-[12px] inline-flex items-center gap-1"><RefreshCw size={12} /> Refresh</button>
        <button onClick={() => setEditing(blank())} className="rh-btn-primary !px-4 !py-2 !text-[13px] inline-flex items-center gap-1.5"><Plus size={14} /> New experiment</button>
      </div>
      <p className="text-[13px] text-ink-muted -mt-4">Every visitor is assigned one variant per experiment, always the same one. Admin accounts, anything flagged internal, and browsers in the Denmark time zone are left out. Preview any variant with <code className="bg-hairline/50 px-1 rounded">?exp=key:B</code> on the page, <code className="bg-hairline/50 px-1 rounded">?exp=off</code> to reset.</p>

      {exps.map((e) => {
        const r = res[e.key] || { variants: {}, goals: {}, daily: [] };
        const goal = goalPick[e.key] || e.goals[0] || "";
        const rows = e.variants.map((v) => { const n = r.variants[v.id] || 0; const c = (r.goals[goal] || {})[v.id] || 0; return { v, n, c, rate: pct(c, n) }; });
        const control = rows[0];
        const best = rows.slice().sort((a, b) => b.rate - a.rate)[0];
        const winner = best && control && best.v.id !== control.v.id && best.n >= 30 && conf(control.c, control.n, best.c, best.n) >= 0.95 ? best : null;
        const mx = Math.max(1, ...r.daily.map((d) => d.n));
        return (
          <section key={e.key} className={`border rounded-2xl bg-white p-5 md:p-6 ${e.active ? "border-hairline" : "border-dashed border-hairline opacity-70"}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[240px]"><p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><FlaskConical size={17} /> {e.name}</p><p className="text-[12px] text-ink-muted mt-0.5 font-mono">{e.key} · {e.page} · {e.kind}{e.notes ? ` · ${e.notes}` : ""}</p></div>
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-ink-muted inline-flex items-center gap-1.5">Goal <select value={goal} onChange={(ev) => setGoalPick({ ...goalPick, [e.key]: ev.target.value })} className="border border-hairline rounded-lg px-2 py-1 text-[12px] bg-paper">{e.goals.map((g) => <option key={g} value={g}>{GOAL_LABEL[g] || g}</option>)}</select></label>
                <button onClick={() => toggle(e)} className={`px-3 py-1.5 rounded-full text-[12px] border ${e.active ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "border-hairline text-ink-muted"}`}>{e.active ? "Live" : "Paused"}</button>
                <button onClick={() => setEditing(JSON.parse(JSON.stringify(e)))} className="px-3 py-1.5 rounded-full border border-hairline text-[12px]">Edit</button>
                <button onClick={() => remove(e)} className="h-8 w-8 rounded-full border border-hairline inline-flex items-center justify-center text-ink-muted hover:text-red-600" aria-label="Delete"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="mt-4 grid lg:grid-cols-[1fr_200px] gap-4">
              <div className="overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left py-2 pr-3">Variant</th><th className="text-right py-2 px-3">Visitors</th><th className="text-right py-2 px-3">{GOAL_LABEL[goal] || goal}</th><th className="text-right py-2 px-3">Rate</th><th className="text-right py-2 px-3">vs A</th><th className="text-right py-2 pl-3">Confidence</th></tr></thead><tbody>
                {rows.map((x, i) => { const lift = control && control.rate ? ((x.rate - control.rate) / control.rate) * 100 : 0; const cf = i === 0 ? null : conf(control.c, control.n, x.c, x.n); return (
                  <tr key={x.v.id} className={`border-t border-hairline/70 ${winner?.v.id === x.v.id ? "bg-emerald-500/5" : ""}`}>
                    <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-ink text-paper text-[11px] font-medium inline-flex items-center justify-center">{x.v.id}</span><span><b>{x.v.label || x.v.id}</b>{x.v.text && <><br /><span className="text-ink-muted">"{x.v.text}"</span></>}</span>{winner?.v.id === x.v.id && <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-emerald-700"><Trophy size={12} /> winner</span>}</span></td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{x.n}</td><td className="py-2.5 px-3 text-right tabular-nums">{x.c}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-medium">{x.rate.toFixed(1)}%</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums ${i === 0 ? "text-ink-muted" : lift > 0 ? "text-emerald-700" : lift < 0 ? "text-red-600" : ""}`}>{i === 0 ? "control" : `${lift >= 0 ? "+" : ""}${lift.toFixed(0)}%`}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums text-ink-muted">{cf == null ? "—" : `${(cf * 100).toFixed(0)}%`}</td>
                  </tr>); })}
              </tbody></table>
                {rows.every((x) => x.n === 0) && <p className="text-[12px] text-ink-muted mt-2 inline-flex items-center gap-1"><Eye size={12} /> No exposures yet in this window.</p>}
                {!winner && rows.some((x) => x.n > 0) && <p className="text-[12px] text-ink-muted mt-2">No winner yet: needs at least 30 visitors per variant and 95% confidence.</p>}
              </div>
              <div><p className="text-[11px] uppercase tracking-wider text-ink-muted mb-1">Visitors per day</p><div className="flex items-end gap-0.5 h-16">{r.daily.slice(-30).map((d) => <div key={d.d} title={`${d.d}: ${d.n}`} className="flex-1 bg-ink rounded-t" style={{ height: `${Math.max(3, (d.n / mx) * 100)}%` }} />)}{r.daily.length === 0 && <span className="text-[12px] text-ink-muted">—</span>}</div></div>
            </div>
          </section>
        );
      })}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div onClick={(ev) => ev.stopPropagation()} className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto bg-paper rounded-2xl border border-hairline p-6 flex flex-col gap-4">
            <p className="font-display text-[24px] tracking-tight">{editing.key ? "Edit experiment" : "New experiment"}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-[12px] text-ink-muted">Key (used in code)<input value={editing.key} onChange={(ev) => setEditing({ ...editing, key: ev.target.value })} placeholder="network_headline" className={inp} /></label>
              <label className="text-[12px] text-ink-muted">Name<input value={editing.name} onChange={(ev) => setEditing({ ...editing, name: ev.target.value })} className={inp} /></label>
              <label className="text-[12px] text-ink-muted">Page<input value={editing.page} onChange={(ev) => setEditing({ ...editing, page: ev.target.value })} className={inp} /></label>
              <label className="text-[12px] text-ink-muted">Kind<select value={editing.kind} onChange={(ev) => setEditing({ ...editing, kind: ev.target.value })} className={inp}><option value="text">text (editable here)</option><option value="design">design (variants live in code)</option></select></label>
            </div>
            <div>
              <p className="text-[12px] text-ink-muted mb-1">Variants. For text experiments the "text" is what the page shows, so you can change copy here without a deploy. Weight 1 = equal split.</p>
              <div className="flex flex-col gap-2">{editing.variants.map((v, i) => <div key={i} className="grid grid-cols-[56px_1fr_2fr_60px_32px] gap-2 items-center"><input value={v.id} onChange={(ev) => { const vs = [...editing.variants]; vs[i] = { ...v, id: ev.target.value.toUpperCase() }; setEditing({ ...editing, variants: vs }); }} className={inp} placeholder="A" /><input value={v.label || ""} onChange={(ev) => { const vs = [...editing.variants]; vs[i] = { ...v, label: ev.target.value }; setEditing({ ...editing, variants: vs }); }} className={inp} placeholder="label" /><input value={v.text || ""} onChange={(ev) => { const vs = [...editing.variants]; vs[i] = { ...v, text: ev.target.value }; setEditing({ ...editing, variants: vs }); }} className={inp} placeholder="text shown on the page" /><input type="number" step="0.5" value={v.weight ?? 1} onChange={(ev) => { const vs = [...editing.variants]; vs[i] = { ...v, weight: Number(ev.target.value) }; setEditing({ ...editing, variants: vs }); }} className={inp} /><button onClick={() => setEditing({ ...editing, variants: editing.variants.filter((_, j) => j !== i) })} className="h-8 w-8 rounded-full border border-hairline inline-flex items-center justify-center text-ink-muted"><Trash2 size={12} /></button></div>)}</div>
              <button onClick={() => setEditing({ ...editing, variants: [...editing.variants, { id: String.fromCharCode(65 + editing.variants.length), label: "", text: "" }] })} className="mt-2 px-3 py-1.5 rounded-full border border-hairline text-[12px] inline-flex items-center gap-1"><Plus size={12} /> Add variant</button>
            </div>
            <div>
              <p className="text-[12px] text-ink-muted mb-1">Goals to measure</p>
              <div className="flex flex-wrap gap-1.5">{ALL_GOALS.map((g) => <button key={g} onClick={() => setEditing({ ...editing, goals: editing.goals.includes(g) ? editing.goals.filter((x) => x !== g) : [...editing.goals, g] })} className={`px-3 py-1.5 rounded-full border text-[12px] ${editing.goals.includes(g) ? "bg-ink text-paper border-ink" : "border-hairline bg-white"}`}>{GOAL_LABEL[g]}</button>)}</div>
            </div>
            <label className="text-[12px] text-ink-muted">Notes<input value={editing.notes || ""} onChange={(ev) => setEditing({ ...editing, notes: ev.target.value })} className={inp} /></label>
            <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={editing.active} onChange={(ev) => setEditing({ ...editing, active: ev.target.checked })} /> Live</label>
            <div className="flex gap-2"><button disabled={busy || !editing.key || !editing.name} onClick={save} className="rh-btn-primary !px-5 !py-2 !text-[13px] inline-flex items-center gap-2">{busy && <Loader2 size={14} className="animate-spin" />} Save</button><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full border border-hairline text-[13px]">Cancel</button></div>
            <p className="text-[12px] text-ink-muted">A design experiment needs its variants implemented in the page code with the same ids. A text experiment works on any page that reads it: right now the home headline, the developers headline and the developers button.</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminExperiments;
