// /dev/:slug — public developer page: who they are, verified or not, their live projects on RealHunt.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, FLAG, track } from "@/lib/rh";
import { BadgeCheck, ExternalLink, Heart, Bookmark, Building2, Loader2 } from "lucide-react";

export default function DevPublic() {
  const { slug = "" } = useParams();
  const [d, setD] = useState<any>(undefined);
  const [busy, setBusy] = useState(false);
  const load = () => db.rpc("community_developer_public", { p_slug: slug }).then(({ data }: any) => setD(data || null), () => setD(null));
  useEffect(() => { load(); track("dev_public_view", { meta: { slug } }); }, [slug]);
  useEffect(() => { if (d?.company) document.title = `${d.company} · Developer on RealHunt`; }, [d?.company]);
  const verify = async (on: boolean) => { setBusy(true); await db.rpc("dev_admin_verify", { p_id: d.id, p_on: on }); setBusy(false); load(); };
  if (d === undefined) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[1080px] mx-auto p-10"><Loader2 className="animate-spin" /></div></div>;
  if (!d) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[1080px] mx-auto p-10"><h1 className="font-display text-3xl">Developer not found</h1><Link to="/" className="underline">Back to RealHunt</Link></div></div>;
  const votes = (d.projects || []).reduce((a: number, p: any) => a + Number(p.votes || 0), 0);
  const saves = (d.projects || []).reduce((a: number, p: any) => a + Number(p.saves || 0), 0);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1080px] mx-auto px-4 md:px-6 pt-8 pb-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">Developer on RealHunt</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-ink text-paper grid place-items-center"><Building2 size={24} /></span>
          <div>
            <h1 className="font-display text-[clamp(28px,4.6vw,44px)] leading-tight tracking-tight">{d.company}</h1>
            <p className="text-[14px] text-ink-muted">{d.country ? `${FLAG[d.country] || "🌍"} ${d.country} · ` : ""}On RealHunt since {new Date(d.since).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {d.verified ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-700 text-[13px] font-semibold"><BadgeCheck size={15} /> Verified developer</span>
            : <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hairline text-ink-muted text-[13px]">Not verified yet</span>}
          {d.signed && <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[13px] font-semibold">Signed the RealHunt Network agreement</span>}
          {d.website && <a href={d.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline bg-white text-[13px]">{d.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")} <ExternalLink size={13} /></a>}
        </div>
        {d.about && <p className="mt-5 text-[16px] leading-relaxed max-w-[64ch]">{d.about}</p>}
        <div className="mt-6 grid grid-cols-3 gap-3 max-w-[520px]">
          <div className="rounded-2xl bg-white border border-hairline p-4"><p className="font-display text-[26px]">{d.projects.length}</p><p className="text-[12px] text-ink-muted">live projects</p></div>
          <div className="rounded-2xl bg-white border border-hairline p-4"><p className="font-display text-[26px] inline-flex items-center gap-1.5">{votes} <Heart size={18} /></p><p className="text-[12px] text-ink-muted">votes from buyers</p></div>
          <div className="rounded-2xl bg-white border border-hairline p-4"><p className="font-display text-[26px] inline-flex items-center gap-1.5">{saves} <Bookmark size={18} /></p><p className="text-[12px] text-ink-muted">saves</p></div>
        </div>
        {d.admin && (
          <div className="mt-6 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-[14px] flex flex-wrap items-center gap-3">
            <b>Admin:</b> {d.pending} project(s) waiting for review in moderation.
            <button disabled={busy} onClick={() => verify(!d.verified)} className="rh-btn-primary !py-2 !px-4 !text-[13px]">{d.verified ? "Remove verified badge" : "Mark as verified developer"}</button>
          </div>
        )}
        <h2 className="font-display text-[24px] tracking-tight mt-10">Projects</h2>
        {d.projects.length === 0 ? <p className="mt-2 text-ink-muted">Their first project is being reviewed. Check back soon.</p> : (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {d.projects.map((p: any) => (
              <Link key={p.slug} to={`/deal/${encodeURIComponent(p.slug)}`} className="group">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#E9E4D8]">{p.image && <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition" loading="lazy" />}
                  {p.price_eur && <span className="absolute left-3 bottom-3 px-3 py-1 rounded-full bg-white font-display">{eur(p.price_eur)}</span>}</div>
                <p className="mt-2 font-semibold">{p.title}</p>
                <p className="text-[13px] text-ink-muted">{FLAG[p.country] || "🌍"} {p.location || p.country}</p>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-14 rounded-2xl bg-ink text-paper p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1"><p className="font-display text-[22px]">Are you a developer too?</p><p className="opacity-75 text-[14px] mt-1">List your project free. You pay 5% only if a buyer we send you buys.</p></div>
          <Link to="/network/start" className="px-5 py-3 rounded-full bg-white text-ink font-semibold text-[15px] text-center">List my project</Link>
        </div>
      </main>
    </div>
  );
}
