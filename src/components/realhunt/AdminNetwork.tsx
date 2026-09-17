import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eur } from "@/lib/rh";
import { Check, X, Handshake, Loader2, Download, FileSignature, BadgeEuro } from "lucide-react";

const db = supabase as any;
const STATUSES = ["proposed", "accepted", "contacted", "visited", "reserved", "sold", "lost"];
const DEAL_STATUSES = ["reported", "invoiced", "paid", "disputed", "void"];
const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—");
const Th = ({ c }: { c: string }) => <th className="text-left text-[11px] uppercase tracking-[0.1em] text-ink-muted font-medium px-3 py-2 border-b border-hairline whitespace-nowrap">{c}</th>;
const Td = ({ c, m, mono }: { c: React.ReactNode; m?: boolean; mono?: boolean }) => <td className={`px-3 py-2 border-b border-hairline/70 text-[13px] align-top ${m ? "text-ink-muted" : ""} ${mono ? "font-mono" : ""}`}>{c}</td>;
const Stat = ({ n, t, tone }: { n: React.ReactNode; t: string; tone?: string }) => <span><b className={`font-display text-[22px] ${tone || ""}`}>{n}</b> <span className="text-ink-muted">{t}</span></span>;

const AdminNetwork = () => {
  const [d, setD] = useState<any | null>(null);
  const [busy, setBusy] = useState("");
  const [pick, setPick] = useState<any | null>(null); // candidate being introduced
  const [to, setTo] = useState(""); const [note, setNote] = useState("");
  const [res, setRes] = useState("");
  const [f, setF] = useState<"all" | "pending" | "approved" | "paused" | "unsigned">("all");
  const [contactFor, setContactFor] = useState<any | null>(null);
  const [contact, setContact] = useState(""); const [cCountry, setCCountry] = useState(""); const [cBudget, setCBudget] = useState("");
  const load = () => db.rpc("admin_network").then(({ data }: any) => setD(data));
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: string) => { setBusy(id); await db.from("network_developers").update({ status, updated_at: new Date().toISOString() }).eq("id", id); await load(); setBusy(""); };
  const setPct = async (id: string, col: "commission_pct" | "source_share_pct", v: number) => { await db.from("network_developers").update({ [col]: v }).eq("id", id); load(); };
  const setNotes = async (id: string, notes: string) => { await db.from("network_developers").update({ notes }).eq("id", id); };
  const setIntro = async (id: string, status: string) => { await db.from("introductions").update({ status, updated_at: new Date().toISOString() }).eq("id", id); load(); };
  const introduce = async () => { if (!pick || !to) return; setBusy("intro"); const { data, error } = await db.rpc("admin_introduce", { p_fp: pick.fp, p_to: to, p_from: pick.from_developer, p_note: note || null }); setBusy(""); setRes(error ? error.message : data.ok ? "Introduced. The developer got an email." : data.reason); if (data?.ok) { setPick(null); setTo(""); setNote(""); load(); } };
  const saveContact = async () => { if (!contactFor) return; setBusy("contact"); await db.rpc("admin_set_intro_contact", { p_id: contactFor.id, p_contact: contact || null, p_country: cCountry || null, p_budget: cBudget ? Number(cBudget) : null }); setBusy(""); setContactFor(null); load(); };
  const setDeal = async (id: string, status: string) => { await db.rpc("admin_set_deal", { p_id: id, p_status: status, p_notes: null }); load(); };
  const setDealNotes = async (id: string, notes: string) => { await db.rpc("admin_set_deal", { p_id: id, p_status: null, p_notes: notes }); };
  const sharePaid = async (id: string) => { await db.rpc("admin_mark_share_paid", { p_id: id }); load(); };
  const devs = useMemo(() => (d?.developers || []).filter((x: any) => f === "all" || (f === "unsigned" ? !x.signed_at : x.status === f)), [d, f]);
  const name = (id: string) => { const x = (d?.developers || []).find((y: any) => y.id === id); return x ? x.project_name || x.company : id.slice(0, 8); };
  const exportDevs = () => { const rows = (d?.developers || []).map((x: any) => [x.company, x.contact_name, x.email, x.phone, x.project_name, x.project_url, x.country, x.price_from, x.status, x.signed_at || "", x.signer || "", x.commission_pct, x.source_share_pct, x.leads, x.shared, x.overlap_rh, x.overlap_net, x.intros_in, x.sold, x.owed, x.created_at].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["company,contact,email,phone,project,url,country,price_from,status,signed_at,signer,commission_pct,source_share_pct,leads,shared,overlap_rh,overlap_net,intros_in,sold,owed,created\n" + rows.join("\n")], { type: "text/csv" })); a.download = "realhunt-network-developers.csv"; a.click(); };
  const exportDeals = () => { const rows = (d?.deals || []).map((x: any) => [x.developer, x.developer_email, x.source, x.buyer, x.sale_price, x.commission_pct, x.commission_eur, x.source_share_eur, x.exempt, x.status, x.reported_at, x.invoiced_at || "", x.paid_at || "", x.source_paid_at || "", x.notes || ""].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["developer,email,source,buyer,sale_price,commission_pct,commission_eur,source_share_eur,exempt,status,reported,invoiced,paid,share_paid,notes\n" + rows.join("\n")], { type: "text/csv" })); a.download = "realhunt-network-deals.csv"; a.click(); };
  if (!d) return <p className="text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading network…</p>;
  const t = d.totals;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
        <Stat n={t.developers} t="developers" /><Stat n={t.pending} t="to review" tone="text-amber-600" /><Stat n={t.signed} t="signed" /><Stat n={t.leads} t="unique fingerprints" /><Stat n={t.shared} t="shared" /><Stat n={t.rh} t="RealHunt buyers" /><Stat n={t.intros} t="introductions" /><Stat n={t.sold} t="sold" />
        <Stat n={eur(Number(t.gmv))} t="GMV" /><Stat n={eur(Number(t.commission_due))} t="commission due to us" tone="text-amber-600" /><Stat n={eur(Number(t.commission_paid))} t="collected" tone="text-emerald-700" /><Stat n={eur(Number(t.shares_due))} t="shares owed to developers" />
      </div>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3"><h2 className="font-display text-[20px] tracking-tight mr-2">Developers</h2>{(["all", "pending", "approved", "paused", "unsigned"] as const).map((k) => <button key={k} onClick={() => setF(k)} className={`px-3 py-1.5 rounded-full border text-[12px] ${f === k ? "bg-ink text-paper border-ink" : "border-hairline bg-white"}`}>{k}</button>)}<span className="flex-1" /><button onClick={exportDevs} className="px-3 py-1.5 rounded-full border border-hairline bg-white text-[12px] inline-flex items-center gap-1"><Download size={12} /> CSV</button></div>
        <div className="border border-hairline rounded-xl bg-white overflow-x-auto"><table className="w-full"><thead><tr><Th c="Project" /><Th c="Contact" /><Th c="Country · from" /><Th c="Signed" /><Th c="Leads" /><Th c="Shared" /><Th c="RH buyers" /><Th c="Overlap" /><Th c="In / out / sold" /><Th c="Owed" /><Th c="% / share" /><Th c="Status" /><Th c="Notes" /></tr></thead><tbody>
          {devs.map((x: any) => <tr key={x.id}>
            <Td c={<><b>{x.project_name || x.company}</b>{x.project_url && <><br /><a href={x.project_url} target="_blank" rel="noreferrer" className="text-[12px] text-ink-muted underline break-all">{x.project_url.replace(/^https?:\/\//, "")}</a></>}<br /><span className="text-[12px] text-ink-muted">{x.company} · {fmt(x.created_at)}</span></>} />
            <Td c={<>{x.contact_name}<br /><a href={`mailto:${x.email}`} className="underline text-[12px]">{x.email}</a>{x.phone && <><br /><a href={`https://wa.me/${String(x.phone).replace(/\D/g, "")}`} className="text-[12px] underline" target="_blank" rel="noreferrer">{x.phone}</a></>}</>} />
            <Td c={<>{x.country || "—"}<br /><span className="text-ink-muted">{x.price_from ? eur(x.price_from) : ""}</span>{x.mode && <><br /><span className="px-1.5 py-0.5 rounded-full bg-hairline text-[11px]">{x.mode === "receive" ? "receive only" : x.mode === "share" ? "share only" : "receive + share"}</span></>}</>} />
            <Td c={x.signed_at ? <span className="text-emerald-700 inline-flex items-center gap-1 text-[12px]"><FileSignature size={12} /> {fmt(x.signed_at)}<br /><span className="text-ink-muted">{x.signer} · v{x.agreement_version}</span></span> : <span className="text-amber-700 text-[12px]">not signed</span>} />
            <Td c={x.leads} /><Td c={x.shared} /><Td c={<b className={Number(x.overlap_rh) ? "text-emerald-700" : ""}>{x.overlap_rh}</b>} /><Td c={x.overlap_net} />
            <Td c={`${x.intros_in} / ${x.intros_out} / ${x.sold}`} />
            <Td c={Number(x.owed) ? <b className="text-amber-700 tabular-nums">{eur(Number(x.owed))}</b> : "—"} />
            <Td c={<span className="inline-flex items-center gap-1"><input type="number" step="0.5" defaultValue={x.commission_pct} onBlur={(e) => Number(e.target.value) !== Number(x.commission_pct) && setPct(x.id, "commission_pct", Number(e.target.value))} className="w-12 border border-hairline rounded-lg px-1.5 py-1 text-[12px] bg-paper" />%<span className="text-ink-muted">/</span><input type="number" step="0.5" defaultValue={x.source_share_pct} onBlur={(e) => Number(e.target.value) !== Number(x.source_share_pct) && setPct(x.id, "source_share_pct", Number(e.target.value))} className="w-12 border border-hairline rounded-lg px-1.5 py-1 text-[12px] bg-paper" />%</span>} />
            <Td c={<div className="flex gap-1">{x.status !== "approved" && <button disabled={busy === x.id || !x.signed_at} title={!x.signed_at ? "Needs to sign the agreement first" : ""} onClick={() => setStatus(x.id, "approved")} className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[12px] inline-flex items-center gap-1 disabled:opacity-40"><Check size={12} /> Approve</button>}{x.status === "approved" && <button onClick={() => setStatus(x.id, "paused")} className="px-2.5 py-1 rounded-full border border-hairline text-[12px]">Pause</button>}{x.status === "pending" && <button onClick={() => setStatus(x.id, "paused")} className="px-2.5 py-1 rounded-full border border-hairline text-[12px] inline-flex items-center gap-1"><X size={12} /></button>}<span className={`px-2 py-1 rounded-full text-[11px] ${x.status === "approved" ? "bg-emerald-500/10 text-emerald-700" : x.status === "pending" ? "bg-amber-500/10 text-amber-700" : "bg-hairline text-ink-muted"}`}>{x.status}</span></div>} />
            <Td c={<input defaultValue={x.notes || ""} placeholder="internal note" onBlur={(e) => setNotes(x.id, e.target.value)} className="w-40 border border-hairline rounded-lg px-2 py-1 text-[12px] bg-paper" />} />
          </tr>)}
          {devs.length === 0 && <tr><Td c="No developers here. They register at /network/app." m /></tr>}
        </tbody></table></div>
      </section>

      {d.matrix.length > 0 && <section><h2 className="font-display text-[20px] tracking-tight mb-3">Who shares buyers with whom</h2><div className="flex flex-wrap gap-2">{d.matrix.map((m: any) => <span key={m.a + m.b} className="px-3 py-1.5 rounded-full border border-hairline bg-white text-[13px]">{name(m.a)} ↔ {name(m.b)}: <b>{m.n}</b></span>)}</div></section>}

      <section>
        <h2 className="font-display text-[20px] tracking-tight mb-1">Shared leads you can introduce</h2>
        <p className="text-[13px] text-ink-muted mb-3">Only leads marked as shared by approved developers. Pick one, choose the receiving project, we check they do not already have that buyer.</p>
        {pick && <div className="border border-ink rounded-xl bg-white p-4 mb-3 flex flex-wrap items-end gap-3">
          <div className="text-[13px]"><p className="font-mono">{pick.fp.slice(0, 12)}…</p><p className="text-ink-muted">from {pick.from_name} · {pick.country || "any"} · {pick.budget ? eur(pick.budget) : "budget ?"}</p></div>
          <label className="text-[12px] text-ink-muted flex flex-col gap-1">Introduce to<select value={to} onChange={(e) => setTo(e.target.value)} className="border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper min-w-[200px]"><option value="">Choose project</option>{d.developers.filter((x: any) => x.status === "approved" && x.id !== pick.from_developer).map((x: any) => <option key={x.id} value={x.id}>{x.project_name || x.company} · {x.country || ""} {x.price_from ? "from " + eur(x.price_from) : ""}{x.signed_at ? "" : " · UNSIGNED"}</option>)}</select></label>
          <label className="text-[12px] text-ink-muted flex flex-col gap-1 flex-1 min-w-[200px]">Note for the developer<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Looking for 2 bedrooms near the beach, budget 150k" className="border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper" /></label>
          <button disabled={!to || busy === "intro"} onClick={introduce} className="rh-btn-primary !px-4 !py-2 !text-[13px] inline-flex items-center gap-1.5"><Handshake size={14} /> Introduce</button><button onClick={() => { setPick(null); setRes(""); }} className="text-[12px] underline text-ink-muted">Cancel</button>
          {res && <p className="w-full text-[13px]">{res}</p>}
        </div>}
        <div className="border border-hairline rounded-xl bg-white overflow-x-auto max-h-[420px] overflow-y-auto"><table className="w-full"><thead><tr><Th c="Fingerprint" /><Th c="From" /><Th c="Country" /><Th c="Budget" /><Th c="Tag" /><Th c="RH buyer" /><Th c="Also with" /><Th c="Intros" /><Th c="Uploaded" /><Th c="" /></tr></thead><tbody>
          {d.candidates.map((c: any) => <tr key={c.fp + c.from_developer}><Td c={c.fp.slice(0, 10) + "…"} mono /><Td c={c.from_name} /><Td c={c.country || "—"} /><Td c={c.budget ? eur(c.budget) : "—"} /><Td c={c.tag || "—"} m /><Td c={c.rh_user ? <b className="text-emerald-700">yes</b> : "—"} /><Td c={c.also_with || "—"} /><Td c={c.intros || "—"} /><Td c={fmt(c.uploaded_at)} m /><Td c={<button onClick={() => { setPick(c); setRes(""); }} className="px-2.5 py-1 rounded-full border border-hairline text-[12px] hover:border-ink">Introduce</button>} /></tr>)}
          {d.candidates.length === 0 && <tr><Td c="Nothing shared yet." m /></tr>}
        </tbody></table></div>
      </section>

      <section>
        <h2 className="font-display text-[20px] tracking-tight mb-1">Introductions</h2>
        <p className="text-[13px] text-ink-muted mb-3">Set the buyer's contact once the developer accepts: it appears in their panel and they can call from there. Developer notes and follow-up dates are visible here too.</p>
        {contactFor && <div className="border border-ink rounded-xl bg-white p-4 mb-3 flex flex-wrap items-end gap-3">
          <p className="w-full text-[13px]">Contact for buyer <span className="font-mono">{contactFor.buyer}</span> → {contactFor.to}</p>
          <label className="text-[12px] text-ink-muted flex flex-col gap-1 flex-1 min-w-[240px]">Contact (name | email | phone)<input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Maria Lopez | maria@mail.com | +34 600 000 000" className="border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper" /></label>
          <label className="text-[12px] text-ink-muted flex flex-col gap-1">Country<input value={cCountry} onChange={(e) => setCCountry(e.target.value)} className="border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper w-32" /></label>
          <label className="text-[12px] text-ink-muted flex flex-col gap-1">Budget €<input type="number" value={cBudget} onChange={(e) => setCBudget(e.target.value)} className="border border-hairline rounded-lg px-2 py-1.5 text-[13px] bg-paper w-28" /></label>
          <button disabled={busy === "contact"} onClick={saveContact} className="rh-btn-primary !px-4 !py-2 !text-[13px]">Save</button><button onClick={() => setContactFor(null)} className="text-[12px] underline text-ink-muted">Cancel</button>
        </div>}
        <div className="border border-hairline rounded-xl bg-white overflow-x-auto"><table className="w-full"><thead><tr><Th c="Buyer" /><Th c="From" /><Th c="To" /><Th c="Note" /><Th c="Contact" /><Th c="Dev notes · next" /><Th c="Status" /><Th c="When" /></tr></thead><tbody>
          {d.introductions.map((i: any) => <tr key={i.id}><Td c={i.buyer + "…"} mono /><Td c={i.from} /><Td c={i.to} /><Td c={i.note || "—"} m /><Td c={<button onClick={() => { setContactFor(i); setContact(i.buyer_contact || ""); setCCountry(i.buyer_country || ""); setCBudget(i.buyer_budget || ""); }} className={`text-[12px] underline ${i.buyer_contact ? "" : "text-amber-700"}`}>{i.buyer_contact ? i.buyer_contact.split("|")[0].trim() : "set contact"}</button>} /><Td c={<>{i.dev_notes ? <span className="line-clamp-2">{i.dev_notes}</span> : "—"}{i.next_action_at && <><br /><span className="text-[11px]">next {fmt(i.next_action_at)}</span></>}</>} m /><Td c={<select value={i.status} onChange={(e) => setIntro(i.id, e.target.value)} className="border border-hairline rounded-lg px-2 py-1 text-[12px] bg-paper">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>} /><Td c={fmt(i.created_at)} m /></tr>)}
          {d.introductions.length === 0 && <tr><Td c="No introductions yet." m /></tr>}
        </tbody></table></div>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-1"><h2 className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><BadgeEuro size={18} /> Deals and commissions</h2><span className="flex-1" /><button onClick={exportDeals} className="px-3 py-1.5 rounded-full border border-hairline bg-white text-[12px] inline-flex items-center gap-1"><Download size={12} /> CSV</button></div>
        <p className="text-[13px] text-ink-muted mb-3">Reported by developers from their panel. Move to invoiced when you send the invoice, paid when the money is in. "Share paid" settles the {"3%"} to the developer who brought the lead.</p>
        <div className="border border-hairline rounded-xl bg-white overflow-x-auto"><table className="w-full"><thead><tr><Th c="Developer" /><Th c="Buyer" /><Th c="Lead from" /><Th c="Sale" /><Th c="Commission" /><Th c="Share to source" /><Th c="Status" /><Th c="Reported" /><Th c="Invoiced" /><Th c="Paid" /><Th c="Notes" /></tr></thead><tbody>
          {(d.deals || []).map((x: any) => <tr key={x.id}>
            <Td c={<><b>{x.developer}</b><br /><a href={`mailto:${x.developer_email}`} className="underline text-[12px]">{x.developer_email}</a></>} />
            <Td c={x.buyer + "…"} mono /><Td c={x.source} />
            <Td c={<b className="tabular-nums">{eur(Number(x.sale_price))}</b>} />
            <Td c={x.exempt ? <span className="text-emerald-700 text-[12px]">exempt<br /><span className="text-ink-muted">{x.exempt_reason}</span></span> : <span className="tabular-nums">{eur(Number(x.commission_eur))} <span className="text-ink-muted">({x.commission_pct}%)</span></span>} />
            <Td c={Number(x.source_share_eur) ? <span className="inline-flex items-center gap-2 tabular-nums">{eur(Number(x.source_share_eur))}{x.source_paid_at ? <span className="text-[11px] text-emerald-700">paid {fmt(x.source_paid_at)}</span> : <button onClick={() => sharePaid(x.id)} className="px-2 py-0.5 rounded-full border border-hairline text-[11px]">mark paid</button>}</span> : "—"} />
            <Td c={<select value={x.status} onChange={(e) => setDeal(x.id, e.target.value)} className={`border rounded-lg px-2 py-1 text-[12px] bg-paper ${x.status === "paid" ? "border-emerald-500" : x.status === "reported" ? "border-amber-400" : "border-hairline"}`}>{DEAL_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>} />
            <Td c={fmt(x.reported_at)} m /><Td c={fmt(x.invoiced_at)} m /><Td c={fmt(x.paid_at)} m />
            <Td c={<input defaultValue={x.notes || ""} placeholder="invoice no., bank ref…" onBlur={(e) => e.target.value !== (x.notes || "") && setDealNotes(x.id, e.target.value)} className="w-40 border border-hairline rounded-lg px-2 py-1 text-[12px] bg-paper" />} />
          </tr>)}
          {(d.deals || []).length === 0 && <tr><Td c="No sales reported yet." m /></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
};
export default AdminNetwork;
