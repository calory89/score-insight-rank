// Developer panel extras (v8): "My projects" tab with live numbers, public page + badge, verified status,
// invite another developer, bulk sharing by tag / country, and the dead-leads simulator.
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { db, eur, FLAG } from "@/lib/rh";
import { BadgeCheck, Plus, Eye, Bookmark, Heart, MessageSquare, Copy, Check, ExternalLink, Share2, Loader2, Pencil, X, Upload, Trash2, ArrowUp, TrendingUp, TrendingDown, Bell } from "lucide-react";
import { SOURCE_SHARE_PCT } from "@/lib/agreement";

const STATUS: Record<string, [string, string]> = {
  pending: ["In review", "bg-amber-400 text-ink"], approved: ["Live", "bg-emerald-600 text-white"], rejected: ["Not accepted", "bg-hairline text-ink-muted"],
};

export function DevProjects() {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const reload = () => db.rpc("dev_projects").then(({ data }: any) => setData(data || { projects: [], invited: [], shared_activity: [] }), () => setData({ projects: [], invited: [], shared_activity: [] }));
  useEffect(() => { reload(); }, []);
  const copy = (t: string, k: string) => navigator.clipboard.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1600); }).catch(() => {});
  if (!data) return <div className="mt-6"><Loader2 className="animate-spin" /></div>;
  const dev = data.developer || {};
  const pub = dev.slug ? `https://realhunt.co/dev/${dev.slug}` : "";
  const invite = dev.invite_code ? `https://realhunt.co/network?dref=${dev.invite_code}` : "";
  const badge = pub ? `<a href="${pub}"><img src="https://realhunt.co/badge/realhunt-partner.svg" alt="Listed on RealHunt" width="180" height="48"></a>` : "";
  const tot = (k: string) => data.projects.reduce((a: number, p: any) => a + Number(p[k] || 0), 0);
  return (
    <div className="mt-6 flex flex-col gap-6">
      <WeeklyReport />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[[Eye, tot("views"), "views"], [Bookmark, tot("saves"), "saves"], [Heart, tot("votes"), "votes"], [MessageSquare, tot("requests"), "buyer requests"]].map(([I, n, t]: any) => (
          <div key={t} className="border border-hairline rounded-2xl bg-white p-5"><p className="font-display text-[30px] leading-none tabular-nums inline-flex items-center gap-2">{n} <I size={18} className="text-ink-muted" /></p><p className="text-[13px] text-ink-muted mt-1.5">{t} on your projects</p></div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-[22px] tracking-tight">Your projects on RealHunt</h2>
        <Link to="/network/start" className="rh-btn-primary !py-2.5 !px-4 !text-[14px] inline-flex items-center gap-1.5"><Plus size={15} /> Add a project</Link>
      </div>
      {data.projects.length === 0 ? (
        <div className="border border-dashed border-hairline rounded-2xl bg-white p-10 text-center"><p className="font-display text-[20px]">No projects yet</p><p className="text-ink-muted text-[14px] mt-1">Paste your project link and we build the listing for you.</p><Link to="/network/start" className="rh-btn-primary inline-flex mt-4">List my first project</Link></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data.projects.map((p: any) => (
            <div key={p.id} className="border border-hairline rounded-2xl bg-white overflow-hidden flex">
              <div className="relative w-36 shrink-0 bg-[#E9E4D8]">{p.image && <img src={p.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}</div>
              <div className="p-4 flex-1 min-w-0">
                <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${(STATUS[p.status] || STATUS.pending)[1]}`}>{(STATUS[p.status] || STATUS.pending)[0]}</span>{p.status === "approved" && !p.in_feed && <span className="text-[11px] text-ink-muted">Own page only (over €100k)</span>}</div>
                <p className="font-semibold mt-1.5 truncate">{p.title}</p>
                <p className="text-[13px] text-ink-muted">{p.price_eur ? eur(p.price_eur) : "No price"} · {FLAG[p.country] || "🌍"} {p.country || ""}</p>
                {p.status === "rejected" && p.reject_reason && <p className="text-[12px] text-ink-muted mt-1">Why: {p.reject_reason}</p>}
                <p className="text-[13px] mt-2 flex flex-wrap gap-x-3 gap-y-1 text-ink-muted"><span><b className="text-ink">{p.views}</b> views</span><span><b className="text-ink">{p.saves}</b> saves</span><span><b className="text-ink">{p.votes}</b> votes</span><span><b className="text-ink">{p.requests}</b> requests</span></p>
                <button onClick={() => setEdit(p)} className="text-[13px] underline mt-2 mr-3 inline-flex items-center gap-1"><Pencil size={12} /> Edit photos, units, payment plan</button>
                {p.status === "approved" && <Link to={`/deal/${encodeURIComponent(p.slug)}`} className="text-[13px] underline mt-2 inline-flex items-center gap-1">See it live <ExternalLink size={12} /></Link>}
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <ProjectEditor project={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      <NotifyToggle on={dev.notify_email !== false} />
      <SharedActivity rows={data.shared_activity || []} />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border border-hairline rounded-2xl bg-white p-5">
          <p className="font-semibold text-[15px] inline-flex items-center gap-2">{dev.verified ? <><BadgeCheck size={17} className="text-sky-600" /> Verified developer</> : "Your public page"}</p>
          {!dev.verified && <p className="text-[13px] text-ink-muted mt-1">The Verified badge appears once you have signed the agreement and we have checked your company and website.</p>}
          {pub && <div className="mt-3 flex gap-2"><code className="flex-1 min-w-0 truncate rounded-xl bg-paper border border-hairline px-3 py-2 text-[13px]">{pub.replace("https://", "")}</code><button onClick={() => copy(pub, "pub")} className="px-3 rounded-xl border border-hairline">{copied === "pub" ? <Check size={14} /> : <Copy size={14} />}</button><a href={pub} target="_blank" rel="noreferrer" className="px-3 rounded-xl border border-hairline grid place-items-center"><ExternalLink size={14} /></a></div>}
          {badge && <div className="mt-4 flex items-center gap-3 flex-wrap"><img src="/badge/realhunt-partner.svg" alt="Listed on RealHunt" width={180} height={48} /><button onClick={() => copy(badge, "badge")} className="px-3 py-2 rounded-xl border border-hairline text-[13px] inline-flex items-center gap-1">{copied === "badge" ? <Check size={14} /> : <Copy size={14} />} Copy badge code for your website</button></div>}
        </div>
        <div className="rounded-2xl bg-ink text-paper p-5">
          <p className="font-semibold text-[15px] inline-flex items-center gap-2"><Share2 size={16} /> Invite another developer</p>
          <p className="text-[13px] opacity-80 mt-1">When a buyer from RealHunt buys from a developer you invited, you get 0.5% of that sale, paid from RealHunt's share within 30 days of us being paid. They pay nothing extra.</p>
          {invite && <div className="mt-3 flex gap-2"><code className="flex-1 min-w-0 truncate rounded-xl bg-white/10 px-3 py-2 text-[13px]">{invite.replace("https://", "")}</code><button onClick={() => copy(invite, "inv")} className="px-3 rounded-xl bg-white text-ink text-[13px] inline-flex items-center gap-1">{copied === "inv" ? <Check size={14} /> : <Copy size={14} />}</button></div>}
          <p className="text-[13px] mt-3 opacity-80">{data.invited.length ? `${data.invited.length} joined: ${data.invited.map((x: any) => x.company + (x.signed ? " ✓" : "")).join(", ")}` : "Nobody invited yet."}</p>
        </div>
      </div>
    </div>
  );
}

// Share or make private a whole group of uploaded contacts at once.
export function BulkShare({ onDone }: { onDone?: () => void }) {
  const [g, setG] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const load = () => db.rpc("dev_lead_tags").then(({ data }: any) => setG(data), () => setG({ tags: [], countries: [] }));
  useEffect(() => { load(); }, []);
  const run = async (tag: string | null, country: string | null, shared: boolean) => {
    const k = `${tag}|${country}|${shared}`; setBusy(k); setMsg("");
    const { data, error } = await db.rpc("dev_share_by_filter", { p_tag: tag, p_country: country, p_min_budget: null, p_shared: shared });
    setBusy(""); if (error) { setMsg(error.message); return; }
    setMsg(`${data.changed} contacts ${shared ? "now shared" : "now private"}.`); load(); onDone?.();
  };
  if (!g || (!g.tags.length && !g.countries.length)) return null;
  const Row = ({ label, n, s, tag, country }: any) => (
    <div className="flex items-center gap-3 py-2 border-t border-hairline/70 text-[14px]">
      <span className="flex-1 min-w-0 truncate"><b>{label}</b> <span className="text-ink-muted">· {n} contacts · {s} shared</span></span>
      <button disabled={!!busy || s === n} onClick={() => run(tag, country, true)} className="px-3 py-1.5 rounded-full border border-ink text-[12px] font-medium disabled:opacity-30">Share all</button>
      <button disabled={!!busy || s === 0} onClick={() => run(tag, country, false)} className="px-3 py-1.5 rounded-full border border-hairline text-[12px] disabled:opacity-30">Make private</button>
    </div>
  );
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5">
      <p className="font-semibold text-[15px]">Share by group</p>
      <p className="text-[13px] text-ink-muted mt-0.5">Flip a whole tag or country in one tap. Shared contacts can earn you {SOURCE_SHARE_PCT}% if they buy elsewhere; private ones only protect you.</p>
      <div className="mt-2">
        {g.tags.map((t: any) => <Row key={"t" + t.tag} label={`#${t.tag}`} n={t.n} s={t.shared} tag={t.tag} country={null} />)}
        {g.countries.map((c: any) => <Row key={"c" + c.country} label={c.country} n={c.n} s={c.shared} tag={null} country={c.country} />)}
      </div>
      {msg && <p className="text-[13px] mt-2" role="status">{msg}</p>}
    </div>
  );
}

// Earnings simulator for dead leads: shown on the landing, in the wizard and in the panel.
export function Simulator({ dark = false }: { dark?: boolean }) {
  const [leads, setLeads] = useState(3000);
  const [conv, setConv] = useState(0.3);
  const [price, setPrice] = useState(150000);
  const sales = useMemo(() => Math.round(leads * conv / 100 * 10) / 10, [leads, conv]);
  const earn = Math.round(sales * price * SOURCE_SHARE_PCT / 100);
  const box = dark ? "bg-ink text-paper" : "bg-white border border-hairline";
  const row = "flex flex-col gap-1.5 text-[13px]";
  return (
    <div className={`rounded-2xl p-5 md:p-7 ${box}`}>
      <p className="font-display text-[22px] tracking-tight">What your old leads could earn</p>
      <div className="mt-4 grid md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="flex flex-col gap-4">
          <label className={row}><span>Leads that never bought from you: <b>{leads.toLocaleString("en-GB")}</b></span><input type="range" min={200} max={30000} step={100} value={leads} onChange={(e) => setLeads(Number(e.target.value))} /></label>
          <label className={row}><span>Share that buy somewhere in the network: <b>{conv}%</b></span><input type="range" min={0.1} max={2} step={0.1} value={conv} onChange={(e) => setConv(Number(e.target.value))} /></label>
          <label className={row}><span>Average sale price: <b>{eur(price)}</b></span><input type="range" min={50000} max={1000000} step={10000} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></label>
        </div>
        <div className="text-center md:text-right">
          <p className="font-display text-[clamp(38px,6vw,60px)] leading-none tabular-nums">{eur(earn)}</p>
          <p className={`text-[13px] mt-2 ${dark ? "opacity-70" : "text-ink-muted"}`}>{sales} sales × {SOURCE_SHARE_PCT}% · paid to you</p>
        </div>
      </div>
      <p className={`text-[12px] mt-4 ${dark ? "opacity-60" : "text-ink-muted"}`}>An illustration, not a promise. You earn only on real, completed sales.</p>
    </div>
  );
}

// ---------------------------------------------------------------- v9 extras
export function WeeklyReport() {
  const [w, setW] = useState<any>(null);
  useEffect(() => { db.rpc("dev_weekly_report").then(({ data }: any) => setW(data), () => {}); }, []);
  if (!w || !w.listings) return null;
  const trend = (a: number, b: number) => (b === 0 ? (a > 0 ? "new" : "") : `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%`);
  const per = w.listings ? Math.round((w.views / w.listings) * 10) / 10 : 0;
  const vsArea = w.area_views_per_listing ? Math.round(((per - w.area_views_per_listing) / w.area_views_per_listing) * 100) : null;
  return (
    <div className="rounded-2xl bg-ink text-paper p-5 md:p-6">
      <p className="text-[12px] uppercase tracking-[0.14em] opacity-70">Your week on RealHunt</p>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><p className="font-display text-[30px] leading-none">{w.views}</p><p className="text-[13px] opacity-75 mt-1">views {trend(w.views, w.views_prev) && <span className="inline-flex items-center gap-0.5">{w.views >= w.views_prev ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend(w.views, w.views_prev)}</span>}</p></div>
        <div><p className="font-display text-[30px] leading-none">{w.saves}</p><p className="text-[13px] opacity-75 mt-1">saves</p></div>
        <div><p className="font-display text-[30px] leading-none">{w.requests}</p><p className="text-[13px] opacity-75 mt-1">buyer requests {trend(w.requests, w.requests_prev) && `(${trend(w.requests, w.requests_prev)})`}</p></div>
        <div><p className="font-display text-[30px] leading-none">{vsArea == null ? "—" : `${vsArea > 0 ? "+" : ""}${vsArea}%`}</p><p className="text-[13px] opacity-75 mt-1">views per listing vs other homes in {w.area || "your area"}</p></div>
      </div>
      <p className="text-[12px] opacity-60 mt-4">Last 7 days compared with the 7 days before. Tip: listings with 8+ photos and a payment plan get more requests.</p>
    </div>
  );
}

function NotifyToggle({ on }: { on: boolean }) {
  const [v, setV] = useState(on);
  return (
    <label className="border border-hairline rounded-2xl bg-white p-4 flex items-center gap-3 text-[14px] cursor-pointer">
      <Bell size={18} className="text-ink-muted" />
      <span className="flex-1"><b>Email me when a buyer asks about my projects</b><span className="block text-[12px] text-ink-muted">You always see them here in your panel. Email alerts start once RealHunt switches them on for the network.</span></span>
      <input type="checkbox" checked={v} onChange={async (e) => { const n = e.target.checked; setV(n); await db.rpc("dev_set_notify", { p_on: n }); }} />
    </label>
  );
}

function SharedActivity({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  const earned = rows.reduce((a, r) => a + Number(r.share_eur || 0), 0);
  return (
    <div className="border border-hairline rounded-2xl bg-white p-5">
      <p className="font-semibold text-[15px]">Your shared leads at work</p>
      <p className="text-[13px] text-ink-muted">{rows.length} introduced to other projects · {eur(earned)} earned so far</p>
      <table className="w-full mt-3 text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left py-1">Project</th><th className="text-left py-1">Status</th><th className="text-left py-1">You earn</th><th className="text-left py-1">Since</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-hairline/70"><td className="py-2">Your lead → {r.to}</td><td className="py-2">{r.status}</td><td className="py-2 tabular-nums">{r.share_eur ? `${eur(Number(r.share_eur))}${r.paid ? " ✓ paid" : ""}` : "—"}</td><td className="py-2 text-ink-muted">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td></tr>)}</tbody></table>
    </div>
  );
}

// Drag and drop photos: resized in the browser (max 1600 px, WebP) and stored in the dev-media bucket.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((res) => c.toBlob((b) => res(b || file), "image/webp", 0.84));
}
export function PhotoDrop({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files?.length) return; setErr("");
    const { data: u } = await supabase.auth.getUser(); const uid = u.user?.id; if (!uid) { setErr("Sign in to upload photos."); return; }
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 12 - images.length);
    setBusy(list.length); const out: string[] = [];
    for (const f of list) {
      try {
        const blob = await shrink(f);
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const { error } = await supabase.storage.from("dev-media").upload(path, blob, { contentType: "image/webp", upsert: false });
        if (error) throw error;
        out.push(supabase.storage.from("dev-media").getPublicUrl(path).data.publicUrl);
      } catch (e) { setErr("Some photos could not be uploaded. Try JPG or PNG under 15 MB."); }
      setBusy((b) => b - 1);
    }
    onChange([...images, ...out]);
  };
  return (
    <div>
      <p className="text-[13px] text-ink-muted mb-2">Your photos ({images.length}/12). The first one is the cover.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.map((src, i) => (
          <div key={src + i} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#E9E4D8]">
            <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute top-1 right-1 flex gap-1">
              {i > 0 && <button type="button" aria-label="Make cover" onClick={() => onChange([src, ...images.filter((_, k) => k !== i)])} className="w-7 h-7 rounded-full bg-white/90 grid place-items-center"><ArrowUp size={14} /></button>}
              <button type="button" aria-label="Remove photo" onClick={() => onChange(images.filter((_, k) => k !== i))} className="w-7 h-7 rounded-full bg-white/90 grid place-items-center"><Trash2 size={14} /></button>
            </div>
            {i === 0 && <span className="absolute bottom-1 left-1 px-2 py-0.5 rounded-full bg-ink text-paper text-[10px] font-semibold">Cover</span>}
          </div>
        ))}
        {images.length < 12 && (
          <button type="button" onClick={() => ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
            className="aspect-[4/3] rounded-xl border-2 border-dashed border-hairline hover:border-ink grid place-items-center text-[12px] text-ink-muted text-center p-2">
            {busy > 0 ? <Loader2 className="animate-spin" /> : <span className="flex flex-col items-center gap-1"><Upload size={18} /> Drop photos or click</span>}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => add(e.target.files)} />
      {err && <p className="text-[12px] text-red-600 mt-1">{err}</p>}
    </div>
  );
}

const inp2 = "w-full border border-hairline rounded-xl px-3 py-2 text-[14px] bg-white outline-none focus:border-ink";
export function ProjectEditor({ project, onClose, onSaved }: { project: any; onClose: () => void; onSaved: () => void }) {
  const [images, setImages] = useState<string[]>(project.images || []);
  const [f, setF] = useState({ title: project.title || "", price_eur: project.price_eur ? String(project.price_eur) : "", location: project.location || "", description: project.description || "" });
  const [units, setUnits] = useState<any[]>(project.units?.length ? project.units : [{ type: "", price_eur: "", sqm: "", available: "" }]);
  const pp = project.payment_plan || {};
  const [plan, setPlan] = useState({ deposit_pct: pp.deposit_pct ?? "", months: pp.months ?? "", handover_pct: pp.handover_pct ?? "", interest_free: !!pp.interest_free, completion: pp.completion || "", note: pp.note || "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    setBusy(true); setErr("");
    const hasPlan = plan.deposit_pct !== "" || plan.months !== "" || plan.note;
    const { error } = await db.rpc("dev_update_project", { p_id: project.id, p: { ...f, images, units: units.filter((u) => String(u.type || "").trim()), payment_plan: hasPlan ? plan : null } });
    setBusy(false); if (error) { setErr(error.message); return; } onSaved();
  };
  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end md:items-center justify-center p-0 md:p-6" role="dialog" aria-modal="true">
      <div className="bg-paper w-full md:max-w-[760px] max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-5 md:p-7">
        <div className="flex items-center justify-between"><p className="font-display text-[22px]">Edit {project.title}</p><button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full border border-hairline grid place-items-center"><X size={16} /></button></div>
        <div className="mt-4 flex flex-col gap-5">
          <PhotoDrop images={images} onChange={setImages} />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-[13px] text-ink-muted flex flex-col gap-1">Project name<input className={inp2} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label className="text-[13px] text-ink-muted flex flex-col gap-1">Price from (€)<input className={inp2} inputMode="numeric" value={f.price_eur} onChange={(e) => setF({ ...f, price_eur: e.target.value.replace(/[^\d]/g, "") })} /></label>
            <label className="text-[13px] text-ink-muted flex flex-col gap-1 sm:col-span-2">Town or area<input className={inp2} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label>
            <label className="text-[13px] text-ink-muted flex flex-col gap-1 sm:col-span-2">Description<textarea className={`${inp2} h-24`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
          </div>
          <div>
            <p className="font-semibold text-[15px]">Unit types</p>
            <p className="text-[12px] text-ink-muted">Each type with its own price. Buyers see them as a small table.</p>
            <div className="mt-2 flex flex-col gap-2">{units.map((u, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] gap-2">
                <input className={inp2} placeholder="Studio" value={u.type} onChange={(e) => setUnits(units.map((x, k) => (k === i ? { ...x, type: e.target.value } : x)))} />
                <input className={inp2} placeholder="€ from" inputMode="numeric" value={u.price_eur ?? ""} onChange={(e) => setUnits(units.map((x, k) => (k === i ? { ...x, price_eur: e.target.value.replace(/[^\d]/g, "") } : x)))} />
                <input className={inp2} placeholder="m²" inputMode="numeric" value={u.sqm ?? ""} onChange={(e) => setUnits(units.map((x, k) => (k === i ? { ...x, sqm: e.target.value.replace(/[^\d]/g, "") } : x)))} />
                <input className={inp2} placeholder="left" inputMode="numeric" value={u.available ?? ""} onChange={(e) => setUnits(units.map((x, k) => (k === i ? { ...x, available: e.target.value.replace(/[^\d]/g, "") } : x)))} />
                <button type="button" aria-label="Remove" onClick={() => setUnits(units.filter((_, k) => k !== i))} className="px-2 text-ink-muted"><X size={16} /></button>
              </div>
            ))}</div>
            {units.length < 10 && <button type="button" onClick={() => setUnits([...units, { type: "", price_eur: "", sqm: "", available: "" }])} className="mt-2 text-[13px] underline">+ Add a unit type</button>}
          </div>
          <div>
            <p className="font-semibold text-[15px]">Payment plan</p>
            <p className="text-[12px] text-ink-muted">The single thing that makes new-build buyers ask. We show the monthly amount for you.</p>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="text-[12px] text-ink-muted flex flex-col gap-1">% to reserve<input className={inp2} inputMode="decimal" value={plan.deposit_pct} onChange={(e) => setPlan({ ...plan, deposit_pct: e.target.value })} /></label>
              <label className="text-[12px] text-ink-muted flex flex-col gap-1">Months to pay<input className={inp2} inputMode="numeric" value={plan.months} onChange={(e) => setPlan({ ...plan, months: e.target.value })} /></label>
              <label className="text-[12px] text-ink-muted flex flex-col gap-1">% at handover<input className={inp2} inputMode="decimal" value={plan.handover_pct} onChange={(e) => setPlan({ ...plan, handover_pct: e.target.value })} /></label>
              <label className="text-[12px] text-ink-muted flex flex-col gap-1">Ready<input className={inp2} placeholder="Q3 2027" value={plan.completion} onChange={(e) => setPlan({ ...plan, completion: e.target.value })} /></label>
            </div>
            <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={plan.interest_free} onChange={(e) => setPlan({ ...plan, interest_free: e.target.checked })} /> 0% interest</label>
            <input className={`${inp2} mt-2`} placeholder="Note (optional), e.g. 5% discount paying in full" value={plan.note} onChange={(e) => setPlan({ ...plan, note: e.target.value })} />
          </div>
          {err && <p className="text-[13px] text-red-600">{err}</p>}
          <div className="flex gap-3"><button onClick={save} disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save</button><button onClick={onClose} className="rh-btn-secondary">Cancel</button></div>
        </div>
      </div>
    </div>
  );
}
