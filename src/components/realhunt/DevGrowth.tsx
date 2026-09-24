// Developer panel extras (v8): "My projects" tab with live numbers, public page + badge, verified status,
// invite another developer, bulk sharing by tag / country, and the dead-leads simulator.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db, eur, FLAG } from "@/lib/rh";
import { BadgeCheck, Plus, Eye, Bookmark, Heart, MessageSquare, Copy, Check, ExternalLink, Share2, Loader2 } from "lucide-react";
import { SOURCE_SHARE_PCT } from "@/lib/agreement";

const STATUS: Record<string, [string, string]> = {
  pending: ["In review", "bg-amber-400 text-ink"], approved: ["Live", "bg-emerald-600 text-white"], rejected: ["Not accepted", "bg-hairline text-ink-muted"],
};

export function DevProjects() {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState("");
  useEffect(() => { db.rpc("dev_projects").then(({ data }: any) => setData(data || { projects: [], invited: [] }), () => setData({ projects: [], invited: [] })); }, []);
  const copy = (t: string, k: string) => navigator.clipboard.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1600); }).catch(() => {});
  if (!data) return <div className="mt-6"><Loader2 className="animate-spin" /></div>;
  const dev = data.developer || {};
  const pub = dev.slug ? `https://realhunt.co/dev/${dev.slug}` : "";
  const invite = dev.invite_code ? `https://realhunt.co/network?dref=${dev.invite_code}` : "";
  const badge = pub ? `<a href="${pub}"><img src="https://realhunt.co/badge/realhunt-partner.svg" alt="Listed on RealHunt" width="180" height="48"></a>` : "";
  const tot = (k: string) => data.projects.reduce((a: number, p: any) => a + Number(p[k] || 0), 0);
  return (
    <div className="mt-6 flex flex-col gap-6">
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
                {p.status === "approved" && <Link to={`/deal/${encodeURIComponent(p.slug)}`} className="text-[13px] underline mt-2 inline-flex items-center gap-1">See it live <ExternalLink size={12} /></Link>}
              </div>
            </div>
          ))}
        </div>
      )}
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
