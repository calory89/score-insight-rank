// /network/admin — Carlos's view of the developer business: the funnel with real numbers, switches for
// buyer alerts and outreach emails (both off until he turns them on), listing claims to approve, the
// outreach list with claim links, and the newest developers.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur } from "@/lib/rh";
import { Check, X, Copy, Loader2, AlertTriangle, ExternalLink } from "lucide-react";

export default function NetworkAdmin() {
  const [d, setD] = useState<any>(undefined);
  const [msg, setMsg] = useState("");
  const [arm, setArm] = useState("");
  const [filter, setFilter] = useState("all");
  const [pend, setPend] = useState<any[]>([]);
  const [boosts, setBoosts] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const load = () => {
    db.rpc("dev_admin_pending_projects").then(({ data }: any) => setPend(data || []), () => {});
    db.rpc("dev_admin_boosts").then(({ data }: any) => setBoosts(data || []), () => {});
    db.rpc("dev_admin_proofs").then(({ data }: any) => setProofs(data || []), () => {});
    return db.rpc("dev_admin_funnel").then(({ data, error }: any) => setD(error ? null : data), () => setD(null));
  };
  const moderate = async (id: string, ok: boolean) => {
    const reason = ok ? null : window.prompt("Why? The developer sees this.", "Photos or price could not be checked");
    if (!ok && reason === null) return;
    const { error } = await db.rpc("community_moderate_deal", { p_deal: id, p_action: ok ? "approve" : "reject", p_reason: reason, p_pick: false, p_pick_note: null });
    setMsg(error ? error.message : ok ? "Approved and live" : "Rejected"); load();
  };
  const boostDecide = async (id: number, on: boolean) => { const { error } = await db.rpc("dev_admin_boost_decide", { p_id: id, p_on: on }); setMsg(error ? error.message : on ? "Boost active" : "Boost stopped"); load(); };
  const proofOpen = async (path: string) => { const { data, error } = await (db as any).storage.from("buyer-proof").createSignedUrl(path, 300); if (error) setMsg(error.message); else window.open(data.signedUrl, "_blank", "noopener"); };
  const proofDecide = async (u: string, ok: boolean) => { const note = ok ? null : window.prompt("What should the buyer fix?", "Upload a clearer bank statement or a mortgage pre-approval letter."); if (!ok && note === null) return; const { error } = await db.rpc("dev_admin_proof_decide", { p_user: u, p_ok: ok, p_note: note }); setMsg(error ? error.message : ok ? "Buyer verified" : "Rejected"); load(); };
  useEffect(() => { document.title = "Network admin · RealHunt"; load(); }, []);
  if (d === undefined) return <div className="min-h-screen bg-paper"><RHNav /><div className="p-10"><Loader2 className="animate-spin" /></div></div>;
  if (!d) return <div className="min-h-screen bg-paper"><RHNav /><div className="p-10">Admins only. <Link to="/network" className="underline">Back</Link></div></div>;
  const ev = d.events || {};
  const steps: [string, number][] = [
    ["Opened the wizard", ev.dev_wizard_open || 0], ["Pasted a link (preview built)", (ev.dev_preview_ok || 0) + (ev.dev_preview_manual || 0)],
    ["Left an email", d.wizard_emails], ["Created an account", d.developers], ["Signed the agreement", d.signed],
    ["Project live", d.projects_live], ["First buyer requests", d.buyer_requests], ["Buyers answered", d.intros_answered], ["Sales", d.sales],
  ];
  const max = Math.max(1, ...steps.map((s) => s[1]));
  const setting = async (key: string, on: boolean) => { const { error } = await db.rpc("dev_admin_setting", { p_key: key, p_on: on }); setMsg(error ? error.message : `${key} ${on ? "ON" : "OFF"}`); setArm(""); load(); };
  const decide = async (id: number, ok: boolean) => { const { data, error } = await db.rpc("dev_admin_claim_decide", { p_id: id, p_approve: ok }); setMsg(error ? error.message : ok ? `Approved · seller page /dev/${data?.developer}` : "Rejected"); load(); };
  const send = async () => { const { data, error } = await db.rpc("dev_admin_send_prospects", { p_limit: 20 }); setMsg(error ? error.message : data?.error || `${data.queued} emails queued`); setArm(""); load(); };
  const prospects = (d.prospect_list || []).filter((p: any) => filter === "all" || p.status === filter || p.country === filter);
  const S = d.settings || {};
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1180px] mx-auto px-4 md:px-6 py-8 flex flex-col gap-8">
        <div><p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">RealHunt Network · admin</p><h1 className="font-display text-[34px] tracking-tight">Developer funnel</h1>{msg && <p className="mt-2 rounded-xl bg-white border border-hairline px-4 py-2 text-[14px]">{msg}</p>}</div>

        <section className="rounded-2xl bg-white border border-hairline p-5 md:p-6">
          <p className="text-[13px] text-ink-muted mb-3">Wizard steps: unique visitors in the last 30 days who accepted analytics cookies (Clarity shows everyone). The rest: all time.</p>
          <div className="flex flex-col gap-2">{steps.map(([t, n], i) => (
            <div key={t} className="grid grid-cols-[210px_1fr_60px] items-center gap-3 text-[14px]"><span>{t}</span><span className="h-6 rounded-lg bg-[#F3F0E8] overflow-hidden"><span className="block h-full rounded-lg" style={{ width: `${Math.max(2, (n / max) * 100)}%`, background: i < 3 ? "#0EA5E9" : i < 6 ? "#16150F" : "#16A34A" }} /></span><b className="text-right tabular-nums">{n}</b></div>
          ))}</div>
          <p className="text-[13px] text-ink-muted mt-4">Commission earned so far: <b className="text-ink">{eur(Number(d.commission_eur || 0))}</b> · verified developers: {d.verified} · projects waiting for review: <b className="text-ink">{d.projects_pending}</b> (<Link to="/hunt/admin" className="underline">moderation</Link>)</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {[["dev_buyer_alerts", "Email developers when a buyer asks", "Every buyer request is always in the developer's panel. With this on, developers who keep email on also get an email."], ["prospect_emails", "Outreach emails to prospects", "Allows the 'Send next 20' button below. Off = nothing can be sent to prospects."]].map(([k, t, sub]) => (
            <div key={k} className={`rounded-2xl border p-5 ${S[k] ? "border-emerald-500 bg-emerald-50" : "border-hairline bg-white"}`}>
              <p className="font-semibold">{t}: {S[k] ? "ON" : "OFF"}</p><p className="text-[13px] text-ink-muted mt-1">{sub}</p>
              {arm === k ? <div className="mt-3 flex gap-2"><button onClick={() => setting(k, !S[k])} className="rh-btn-primary !py-2 !px-4 !text-[13px]">Yes, switch {S[k] ? "off" : "on"}</button><button onClick={() => setArm("")} className="px-3 text-[13px] underline">Cancel</button></div>
                : <button onClick={() => setArm(k)} className="mt-3 px-4 py-2 rounded-full border border-ink text-[13px] font-medium">Switch {S[k] ? "off" : "on"}</button>}
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-display text-[22px]">Developer projects to approve ({pend.length})</h2>
          {pend.length === 0 ? <p className="text-ink-muted text-[14px] mt-1">None right now.</p> : <div className="mt-3 grid md:grid-cols-2 gap-3">{pend.map((p: any) => (
            <div key={p.id} className="rounded-2xl bg-white border border-hairline overflow-hidden flex">
              <div className="w-[120px] shrink-0 bg-[#E9E4D8]">{p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}</div>
              <div className="p-3 text-[13px] flex-1 min-w-0"><p className="font-semibold text-[14px] truncate">{p.title}</p><p className="text-ink-muted">{p.company}{p.signed ? " · signed" : " · not signed"} · {p.location || p.country} · {p.price_eur ? eur(p.price_eur) : "no price"} · {p.images} photos</p>
                {p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">their page <ExternalLink size={11} /></a>}
                <div className="mt-2 flex gap-2"><button onClick={() => moderate(p.id, true)} className="rh-btn-primary !py-1.5 !px-3 !text-[13px] inline-flex items-center gap-1"><Check size={14} /> Approve</button><button onClick={() => moderate(p.id, false)} className="px-3 py-1.5 rounded-full border border-hairline text-[13px] inline-flex items-center gap-1"><X size={14} /> Reject</button><Link to={`/deal/${p.slug}`} className="text-[12px] underline self-center">preview</Link></div></div>
            </div>
          ))}</div>}
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <h2 className="font-display text-[22px]">Featured spots ({boosts.filter((b) => b.status === "active").length} live · {boosts.filter((b) => b.status === "requested").length} queued)</h2>
            <p className="text-[13px] text-ink-muted">Free and automatic: one per country for 2 weeks, in turns. You can stop one or switch a queued one on early.</p>
            {boosts.length === 0 ? <p className="text-ink-muted text-[14px] mt-1">None yet.</p> : <div className="mt-2 flex flex-col gap-2">{boosts.map((b: any) => (
              <div key={b.id} className="rounded-xl bg-white border border-hairline p-3 text-[13px]"><b>{b.company}</b> · {b.deal} ({b.country}) · {b.weeks} wk · <i>{b.status}</i>{b.ends_at ? ` until ${new Date(b.ends_at).toLocaleDateString("en-GB")}` : ""}<p className="text-ink-muted">{b.email}</p>
                <div className="mt-1 flex gap-2">{b.status === "requested" && <button onClick={() => boostDecide(b.id, true)} className="rh-btn-primary !py-1 !px-3 !text-[12px]">Switch on</button>}{(b.status === "requested" || b.status === "active") && <button onClick={() => boostDecide(b.id, false)} className="px-3 py-1 rounded-full border border-hairline text-[12px]">{b.status === "active" ? "Stop" : "Decline"}</button>}</div></div>
            ))}</div>}
          </div>
          <div>
            <h2 className="font-display text-[22px]">Serious-buyer checks ({proofs.filter((p) => p.status === "pending").length})</h2>
            <p className="text-[13px] text-ink-muted">Open the file, check the name and that the funds cover a home under €100,000.</p>
            {proofs.length === 0 ? <p className="text-ink-muted text-[14px] mt-1">None yet.</p> : <div className="mt-2 flex flex-col gap-2">{proofs.map((p: any) => (
              <div key={p.user_id} className="rounded-xl bg-white border border-hairline p-3 text-[13px]"><b>{p.email}</b> · {p.kind} · <i>{p.status}</i>
                <div className="mt-1 flex gap-2"><button onClick={() => proofOpen(p.path)} className="px-3 py-1 rounded-full border border-hairline text-[12px]">Open file</button>{p.status === "pending" && <><button onClick={() => proofDecide(p.user_id, true)} className="rh-btn-primary !py-1 !px-3 !text-[12px]">Verify</button><button onClick={() => proofDecide(p.user_id, false)} className="px-3 py-1 rounded-full border border-hairline text-[12px]">Reject</button></>}</div></div>
            ))}</div>}
          </div>
        </section>

        <section>
          <h2 className="font-display text-[22px]">Listing claims to review ({d.claims.length})</h2>
          {d.claims.length === 0 ? <p className="text-ink-muted text-[14px] mt-1">None right now.</p> : <div className="mt-3 flex flex-col gap-3">{d.claims.map((c: any) => (
            <div key={c.id} className="rounded-2xl bg-white border border-hairline p-4 text-[14px] flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1"><b>{c.company}</b> ({c.role}) claims <Link to={`/deal/${c.deal_slug}`} className="underline">{c.deal}</Link><p className="text-[13px] text-ink-muted">{c.email} · {c.phone || "no phone"} · {c.website || "no website"}</p>{c.proof && <p className="text-[13px] mt-1">“{c.proof}”</p>}</div>
              <div className="flex gap-2"><button onClick={() => decide(c.id, true)} className="rh-btn-primary !py-2 !px-4 !text-[13px] inline-flex items-center gap-1"><Check size={14} /> Approve</button><button onClick={() => decide(c.id, false)} className="px-4 py-2 rounded-full border border-hairline text-[13px] inline-flex items-center gap-1"><X size={14} /> Reject</button></div>
            </div>
          ))}</div>}
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h2 className="font-display text-[22px]">Outreach list ({(d.prospect_list || []).length} · {d.prospects_with_email} with a public email)</h2>
            {arm === "send" ? <div className="flex gap-2 items-center"><span className="text-[13px] inline-flex items-center gap-1"><AlertTriangle size={14} /> Sends 20 real emails.</span><button onClick={send} className="rh-btn-primary !py-2 !px-4 !text-[13px]">Yes, send</button><button onClick={() => setArm("")} className="text-[13px] underline">Cancel</button></div>
              : <button disabled={!S.prospect_emails} onClick={() => setArm("send")} className="px-4 py-2 rounded-full border border-ink text-[13px] font-medium disabled:opacity-40" title={S.prospect_emails ? "" : "Switch outreach emails on first"}>Send next 20 emails</button>}
          </div>
          <p className="text-[13px] text-ink-muted">Automatic: every day at 10:00 (Spain) 20 more are sent while the switch is on, and whoever opened their listing 4+ days ago without claiming gets one reminder. <Link to="/research/new-builds" className="underline">Monthly report</Link> · <Link to="/network/example" className="underline">Example listing</Link></p>
          <p className="text-[13px] text-ink-muted">Status: {Object.entries(d.prospects || {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "empty"}. Each claim link opens the ready listing; nothing is public until they claim it.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[13px]">{["all", "previewed", "emailed", "opened", "claimed", "optout", "Indonesia", "Albania", "Mexico", "Georgia", "Vietnam", "Spain"].map((k) => <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full border ${filter === k ? "bg-ink text-paper border-ink" : "bg-white border-hairline"}`}>{k}</button>)}</div>
          <div className="mt-3 rounded-2xl bg-white border border-hairline overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted"><th className="px-3 py-2">Developer</th><th className="px-3 py-2">Project</th><th className="px-3 py-2">Where</th><th className="px-3 py-2">From</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Claim link</th></tr></thead>
            <tbody>{prospects.map((p: any) => (
              <tr key={p.claim_code} className="border-t border-hairline/70"><td className="px-3 py-2">{p.company}</td><td className="px-3 py-2">{p.project_name}{p.kind === "lots" ? <span className="ml-1 px-1.5 rounded bg-amber-100 text-[11px]">land</span> : null}</td><td className="px-3 py-2">{p.area || p.country}</td><td className="px-3 py-2 tabular-nums">{p.price_from_eur ? eur(p.price_from_eur) : "—"}</td><td className="px-3 py-2">{p.has_email ? "✓" : "—"}</td><td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2 whitespace-nowrap"><a href={`/claim/${p.claim_code}`} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">open <ExternalLink size={11} /></a> <button onClick={() => navigator.clipboard.writeText(`https://realhunt.co/claim/${p.claim_code}`)} className="ml-2 inline-flex"><Copy size={12} /></button></td></tr>
            ))}</tbody></table></div>
        </section>

        <section>
          <h2 className="font-display text-[22px]">Newest developers</h2>
          <div className="mt-3 rounded-2xl bg-white border border-hairline overflow-x-auto"><table className="w-full text-[13px]"><tbody>{(d.latest || []).map((x: any) => (
            <tr key={x.id} className="border-t border-hairline/70 first:border-0"><td className="px-3 py-2"><b>{x.company}</b></td><td className="px-3 py-2">{x.email}</td><td className="px-3 py-2">{x.mode}</td><td className="px-3 py-2">{x.signed ? "signed" : "not signed"}</td><td className="px-3 py-2">{x.verified ? "verified" : ""}</td><td className="px-3 py-2">{new Date(x.created_at).toLocaleDateString("en-GB")}</td><td className="px-3 py-2">{x.slug && <Link to={`/dev/${x.slug}`} className="underline">page</Link>}</td></tr>
          ))}</tbody></table></div>
        </section>
      </main>
    </div>
  );
}
