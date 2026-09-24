// Developer panel extras (v10): rank in your country, featured spot request, website widget, 30-second video,
// reservation contract template and the agents programme.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/rh";
import Reel from "@/components/realhunt/Reel";
import { Trophy, Rocket, Code2, Copy, Check, FileText, Users } from "lucide-react";

export default function DevExtras() {
  const [rank, setRank] = useState<any[] | null>(null);
  const [data, setData] = useState<any>(null);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [pick, setPick] = useState("");
  const [weeks, setWeeks] = useState(2);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [reelFor, setReelFor] = useState("");
  const load = () => {
    db.rpc("dev_country_rank").then(({ data }: any) => setRank(data || []), () => setRank([]));
    db.rpc("dev_projects").then(({ data }: any) => setData(data || null), () => {});
    db.rpc("dev_my_boosts").then(({ data }: any) => setBoosts(data || []), () => {});
  };
  useEffect(load, []);
  const projects: any[] = (data?.projects || []).filter((p: any) => p.status === "approved");
  const slug = data?.developer?.slug;
  const snippet = slug ? `<div data-realhunt-dev="${slug}"></div>\n<script src="https://realhunt.co/embed.js" async></script>` : "";
  const boost = async () => {
    if (!pick) return;
    const { data: r, error } = await db.rpc("dev_boost_request", { p_deal: pick, p_weeks: weeks });
    setMsg(error ? error.message : r?.error || (r?.already ? "You already asked for this one. We will be in touch." : "Request sent. We email you the price and dates; nothing is charged until you agree."));
    try { (window as any).clarity?.("event", "boost_request"); } catch { /* ignore */ }
    load();
  };
  const reelP = projects.find((p) => p.id === reelFor);
  return (
    <div className="mt-6 grid md:grid-cols-2 gap-4">
      <section className="rounded-2xl bg-white border border-hairline p-5">
        <p className="font-semibold inline-flex items-center gap-2"><Trophy size={17} /> Your rank in your country</p>
        {rank === null ? <p className="text-[13px] text-ink-muted mt-2">Loading…</p> : rank.length === 0 ? <p className="text-[13px] text-ink-muted mt-2">Once a project is live you see here where it ranks against every home in its country, and how many votes you need to climb.</p> : (
          <ul className="mt-3 flex flex-col gap-2 text-[14px]">{rank.map((r) => (
            <li key={r.slug} className="rounded-xl bg-[#F6F3EC] p-3"><b>#{r.rank}</b> of {r.of} homes in {r.country} · <span className="text-ink-muted">#{r.rank_new} of {r.of_new} new builds</span>
              <p className="text-[13px] text-ink-muted">{r.title} · {r.views30} views in 30 days{r.gap != null && r.gap > 0 ? ` · ${r.gap} more points (votes, or saves ×2) to move up` : r.rank === 1 ? " · you are #1" : ""}</p></li>
          ))}</ul>
        )}
        <p className="text-[12px] text-ink-muted mt-2">Points are buyers' votes plus two per save. Share your listing to climb.</p>
      </section>

      <section className="rounded-2xl bg-white border border-hairline p-5">
        <p className="font-semibold inline-flex items-center gap-2"><Rocket size={17} /> Featured spot in your destination</p>
        <p className="text-[13px] text-ink-muted mt-1">Your project shows first on the new-builds page of its country, marked “Sponsored”. You get the price and dates by email before anything is charged.</p>
        {projects.length === 0 ? <p className="text-[13px] text-ink-muted mt-3">Available once a project is live.</p> : (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="h-10 px-3 rounded-xl border border-hairline bg-white text-[14px] max-w-[220px]"><option value="">Pick a project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
            <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="h-10 px-3 rounded-xl border border-hairline bg-white text-[14px]">{[1, 2, 4, 8].map((w) => <option key={w} value={w}>{w} {w === 1 ? "week" : "weeks"}</option>)}</select>
            <button disabled={!pick} onClick={boost} className="rh-btn-primary !py-2 !px-4 !text-[14px] disabled:opacity-40">Ask for it</button>
          </div>
        )}
        {msg && <p className="text-[13px] mt-2">{msg}</p>}
        {boosts.length > 0 && <ul className="mt-3 text-[13px] text-ink-muted">{boosts.map((b) => <li key={b.id}>{projects.find((p) => p.id === b.deal_id)?.title || "Project"} · {b.weeks} wk · {b.status}{b.ends_at && b.status === "active" ? ` until ${new Date(b.ends_at).toLocaleDateString("en-GB")}` : ""}</li>)}</ul>}
      </section>

      <section className="rounded-2xl bg-white border border-hairline p-5">
        <p className="font-semibold inline-flex items-center gap-2"><Code2 size={17} /> Show your RealHunt projects on your website</p>
        <p className="text-[13px] text-ink-muted mt-1">Paste this where you want the cards. It shows your live projects with a “View on RealHunt” button, your rating and badges, and updates by itself.</p>
        {slug ? <>
          <pre className="mt-3 text-[12px] bg-[#16150F] text-[#F4F2EC] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
          <button onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="mt-2 px-3 py-1.5 rounded-full border border-hairline text-[13px] inline-flex items-center gap-1">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy code"}</button>
        </> : <p className="text-[13px] text-ink-muted mt-3">Available once your developer page exists.</p>}
      </section>

      <section className="rounded-2xl bg-white border border-hairline p-5 flex flex-col gap-3">
        <p className="font-semibold">Tools</p>
        <Link to="/network/reservation-contract" className="text-[14px] inline-flex items-center gap-2 underline"><FileText size={15} /> Reservation contract template (fill in, print)</Link>
        <Link to="/agents" className="text-[14px] inline-flex items-center gap-2 underline"><Users size={15} /> Local agents bring you buyers (they earn from RealHunt's share, not yours)</Link>
        {projects.length > 0 && <>
          <select value={reelFor} onChange={(e) => setReelFor(e.target.value)} className="h-10 px-3 rounded-xl border border-hairline bg-white text-[14px]"><option value="">Make a 30-second video of…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
          {reelP && <Reel key={reelP.id} images={reelP.images || []} title={reelP.title} price={reelP.price_eur} place={[reelP.location, reelP.country].filter(Boolean).join(", ")} company={data?.developer?.company} cta="Post it with your RealHunt link so buyers can ask you directly." />}
        </>}
      </section>
    </div>
  );
}
