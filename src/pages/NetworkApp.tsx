import { saveChange, fetchAll, downloadCsv, safeProjectUrl } from "@/lib/platform";
import { contactCandidates } from "@/lib/contact-import";
import Pagination from "@/components/realhunt/Pagination";
import BuyerHistory from "@/components/realhunt/BuyerHistory";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { db, eur, track } from "@/lib/rh";
import { AGREEMENT_VERSION, COMMISSION_PCT, SOURCE_SHARE_PCT, PAYMENT_DAYS } from "@/lib/agreement";
import { Lock, Upload, Users, Search, Check, Download, Trash2, ShieldCheck, Handshake, Fingerprint, Loader2, ToggleLeft, ToggleRight, ChevronRight, FileSignature, LayoutGrid, List, Phone, Mail, CalendarClock, BadgeEuro, AlertTriangle, X, Receipt, Sparkles, Copy } from "lucide-react";

// ── fingerprints, not contacts ─────────────────────────────────────────────────
// sha256(normalized value + "|rhn1"), computed here in the browser. The raw email or phone never leaves this tab.
const normEmail = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => s.replace(/\D/g, "").replace(/^00/, "");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isPhone = (s: string) => normPhone(s).length >= 7 && /^[+\d\s().-]+$/.test(s.trim());
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|rhn1")))).map((b) => b.toString(16).padStart(2, "0")).join("");
export const fingerprint = async (raw: string) => (isEmail(raw) ? { fp: await sha(normEmail(raw)), kind: "email" } : isPhone(raw) ? { fp: await sha(normPhone(raw)), kind: "phone" } : null);
const mask = (fp: string) => `${fp.slice(0, 6)}…${fp.slice(-4)}`;
const COUNTRIES = ["", "Spain", "Portugal", "Italy", "France", "Greece", "Indonesia", "Thailand", "Mexico", "Dominican Republic", "Turkey", "UAE", "Other"];
const STATUS: Record<string, string> = { proposed: "New", accepted: "Accepted", contacted: "Contacted", visited: "Visited", reserved: "Reserved", sold: "Sold", lost: "Lost" };
const STAGES = ["proposed", "accepted", "contacted", "visited", "reserved", "sold", "lost"];
const NEXT: Record<string, string[]> = { proposed: ["accepted", "lost"], accepted: ["contacted", "lost"], contacted: ["visited", "reserved", "lost"], visited: ["reserved", "lost"], reserved: ["sold", "lost"], sold: [], lost: ["accepted"] };
type Tab = "overview" | "buyers" | "upload" | "leads" | "deals" | "earnings" | "settings" | "privacy";
const TABS: [Tab, string][] = [["overview", "Overview"], ["buyers", "Buyers"], ["upload", "Upload contacts"], ["leads", "My contacts"], ["deals", "Deals & commission"], ["earnings", "Earnings"], ["settings", "Settings"], ["privacy", "How it works"]];
const fmtD = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "");
const daysAgo = (s: string) => Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 86400000));

const Kpi = ({ n, t, sub, warn }: { n: React.ReactNode; t: string; sub?: string; warn?: boolean }) => <div className={`border rounded-2xl bg-white p-5 ${warn ? "border-amber-400" : "border-hairline"}`}><p className="font-display text-[30px] leading-none tracking-tight tabular-nums">{n}</p><p className="text-[13px] text-ink-muted mt-2">{t}</p>{sub && <p className="text-[12px] text-ink-muted/80 mt-0.5">{sub}</p>}</div>;
const Field = ({ l, children }: { l: string; children: React.ReactNode }) => <label className="flex flex-col gap-1 text-[13px] text-ink-muted">{l}{children}</label>;
const inp = "border border-hairline rounded-xl px-3.5 py-2.5 text-[14px] text-ink bg-paper outline-none focus:border-ink";
const Pill = ({ s }: { s: string }) => <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${s === "sold" ? "bg-emerald-600 text-white" : s === "lost" ? "bg-hairline text-ink-muted" : s === "proposed" ? "bg-amber-500/15 text-amber-800" : "bg-ink text-paper"}`}>{STATUS[s] || s}</span>;

const NetworkApp = () => {
  const { user, loading: authLoading } = useAuth() as any;
  const { tab: tParam } = useParams();
  const nav = useNavigate();
  const tab: Tab = (TABS.find(([k]) => k === tParam)?.[0] || "overview") as Tab;
  const [ov, setOv] = useState<any | null | undefined>(undefined); // undefined = loading, null = no profile
  const [auth, setAuth] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  const [form, setForm] = useState<any>({ company: "", contact_name: "", email: "", phone: "", website: "", country: "", project_name: "", project_url: "", price_from: "", share_default: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [checkRes, setCheckRes] = useState<any | null>(null);
  const [onlyShared, setOnlyShared] = useState<"all" | "shared" | "private">("all");
  // upload state
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<{ raw: string; fp: string; kind: string }[]>([]);
  const [prog, setProg] = useState(0);
  const [upOpts, setUpOpts] = useState({ shared: false, country: "", budget: "", tag: "" });
  const [upRes, setUpRes] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // CRM state
  const [view, setView] = useState<"board" | "list">(() => { try { return (localStorage.getItem("rh_crm_view") as any) || "board"; } catch { return "board"; } });
  const [open, setOpen] = useState<any | null>(null); // buyer drawer
  const [sale, setSale] = useState<any | null>(null); // report sale modal
  const [price, setPrice] = useState("");
  const [saleNote, setSaleNote] = useState("");
  const [saleRes, setSaleRes] = useState<any | null>(null);
  const [copied, setCopied] = useState("");
  const [contactPage, setContactPage] = useState(0);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactQuery, setContactQuery] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState(false);
  const [contactRevision, setContactRevision] = useState(0);
  const [importIssues, setImportIssues] = useState<{ row: number; message: string }[]>([]);
  const [importDuplicates, setImportDuplicates] = useState(0);
  const [buyerQuery, setBuyerQuery] = useState("");
  const [followupsOnly, setFollowupsOnly] = useState(false);
  const [buyerLimit, setBuyerLimit] = useState(30);
  const mutation = useRef(false);
  const resumeKey = user ? `rh_import_${user.id}` : "";
  const setMode = async (mode: string) => {
    const result = await saveChange(() => db.from("network_developers").update({ mode, share_default: mode !== "receive", updated_at: new Date().toISOString() }).eq("id", ov.developer.id).select("id").single(), "Preference saved");
    if (result.ok) { await load(); track("devapp_mode", { meta: { mode } }); }
  };

  const load = async () => {
    setLoadErr(false);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const res: any = await Promise.race([
        db.rpc("dev_overview"),
        new Promise((_, rej) => { timeout = setTimeout(() => rej(new Error("timeout")), 20000); }),
      ]);
      if (res?.error) { setLoadErr(true); return; }
      const data = res?.data;
      setOv(data ?? null);
      if (data) setOpen((current: any) => current ? data.received?.find((i: any) => i.id === current.id) || null : null);
      if (data) { const f = data.developer; setForm({ company: f.company || "", contact_name: f.contact_name || "", email: f.email || "", phone: f.phone || "", website: f.website || "", country: f.country || "", project_name: f.project_name || "", project_url: f.project_url || "", price_from: f.price_from || "", share_default: !!f.share_default }); }
    } catch { setLoadErr(true); } finally { clearTimeout(timeout); }
  };
  useEffect(() => { document.title = "Developer panel · RealHunt Network"; track("devapp_view", { meta: { tab } }); }, [tab]);
  useEffect(() => { if (!user) { setOv(undefined); return; } load(); try { const p = JSON.parse(sessionStorage.getItem("rh_dev_prefill") || "null"); if (p) setForm((f: any) => ({ ...f, email: p.email || user.email || "", phone: p.phone || "", project_url: p.project_url || "" })); else setForm((f: any) => ({ ...f, email: user.email || "" })); } catch {} }, [user]);
  const contactsQuery = (offset: number, size: number) => db.rpc("dev_contacts_page", { p_query: contactQuery, p_mode: onlyShared, p_offset: offset, p_limit: size });
  useEffect(() => { setContactPage(0); }, [contactQuery, onlyShared]);
  useEffect(() => {
    if (!ov || tab !== "leads") return;
    let active = true; setContactLoading(true); setContactError(false);
    const timer = setTimeout(() => Promise.resolve(contactsQuery(contactPage * 50, 50)).then(({ data, error }: any) => {
      if (!active) return;
      if (error) { setContactError(true); return; }
      setLeads(data.rows || []); setContactTotal(data.total || 0);
    }).catch(() => { if (active) setContactError(true); }).finally(() => { if (active) setContactLoading(false); }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [ov?.developer?.id, tab, contactPage, contactQuery, onlyShared, contactRevision]);
  useEffect(() => {
    if (!resumeKey) return;
    try { const pending = JSON.parse(sessionStorage.getItem(resumeKey) || "null"); if (pending?.rows?.length) { setRows(pending.rows.map((r: any) => ({ ...r, raw: "Previously prepared contact" }))); setUpOpts(pending.options); setMsg("An interrupted import is ready to resume. Only fingerprints were saved in this tab."); } } catch {}
  }, [resumeKey]);
  useEffect(() => { try { localStorage.setItem("rh_crm_view", view); } catch {} }, [view]);

  const register = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setBusy(true); setMsg("");
    let url: string; try { url = safeProjectUrl(form.project_url); } catch { setBusy(false); setMsg("Enter a valid project website."); return; }
    const payload = { ...form, project_url: url, price_from: form.price_from ? Number(form.price_from) : null, user_id: user.id };
    const result = await saveChange(() => ov ? db.from("network_developers").update(payload).eq("user_id", user.id).select("id").single() : db.from("network_developers").insert(payload).select("id").single());
    setBusy(false); if (!result.ok) { setMsg("Could not save. Your form is still here; please try again."); return; }
    track(ov ? "devapp_update" : "devapp_register"); try { sessionStorage.removeItem("rh_dev_prefill"); } catch {}
    await load(); if (!ov) nav("/network/agreement"); else setMsg("Saved.");
  };

  const parse = async (text: string) => {
    setMsg(""); setRows([]);
    if (text.length > 10 * 1024 * 1024) { setMsg("Use a file smaller than 10 MB."); setProg(0); return; }
    const found = contactCandidates(text); setImportIssues(found.issues); setImportDuplicates(found.duplicates);
    if (found.invalid) { setProg(0); return; }
    const out: { raw: string; fp: string; kind: string }[] = [];
    try {
      for (let i = 0; i < found.contacts.length; i += 100) {
        const batch = await Promise.all(found.contacts.slice(i, i + 100).map(async raw => { const result = await fingerprint(raw); return result ? { raw, ...result } : null; }));
        out.push(...batch.filter((r): r is NonNullable<typeof r> => r !== null));
        setProg(Math.round(Math.min(i + 100, found.contacts.length) / found.contacts.length * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      setRows(out); setProg(100);
    } catch { setMsg("Could not prepare contacts. Please try again."); setProg(0); }
  };
  const onFile = async (f: File | undefined) => {
    if (!f || busy) return; setRaw(""); setUpRes(null); setProg(1);
    if (f.size > 10 * 1024 * 1024) { setMsg("Use a file smaller than 10 MB."); setProg(0); return; }
    try { await parse(await f.text()); } catch { setMsg("Could not read this file."); setProg(0); }
  };
  const send = async () => {
    if (!rows.length || mutation.current) return; mutation.current = true; setBusy(true); setUpRes(null); setMsg("");
    let remaining = rows.slice(); let inserted = 0, duplicates = 0; const total = rows.length;
    const checkpoint = () => { try { sessionStorage.setItem(resumeKey, JSON.stringify({ rows: remaining.map(({ fp, kind }) => ({ fp, kind })), options: upOpts })); } catch {} };
    checkpoint();
    try {
      while (remaining.length) {
        const batch = remaining.slice(0, 250).map(({ fp, kind }) => ({ fp, kind, shared: upOpts.shared, country: upOpts.country || null, budget: upOpts.budget ? Number(upOpts.budget) : null, tag: upOpts.tag || null }));
        const result = await saveChange<any>(() => db.rpc("dev_upload_fps", { p_rows: batch }));
        if (!result.ok) { setRows(remaining); setMsg(`${total - remaining.length} processed. ${remaining.length} remaining. Retry to continue safely.`); return; }
        inserted += result.data.inserted || 0; duplicates += result.data.duplicates || 0;
        remaining = remaining.slice(batch.length); checkpoint(); setProg(Math.round((total - remaining.length) / total * 100));
      }
      try { sessionStorage.removeItem(resumeKey); } catch {}
      setUpRes({ inserted, duplicates }); setRows([]); setRaw(""); setContactRevision(x => x + 1); await load();
      track("devapp_upload", { meta: { n: total, shared: upOpts.shared } });
    } finally { mutation.current = false; setBusy(false); }
  };
  const setShared = async (ids: number[], shared: boolean) => {
    if (!ids.length || mutation.current) return; mutation.current = true;
    const result = await saveChange(() => db.from("lead_fingerprints").update({ shared }).in("id", ids).select("id"), "Sharing preference saved");
    mutation.current = false;
    if (result.ok) { setContactRevision(x => x + 1); await load(); }
  };
  const check = async (e: React.FormEvent) => {
    e.preventDefault(); const r = await fingerprint(q); if (!r) { setCheckRes({ bad: true }); return; }
    const result = await saveChange<any>(() => db.rpc("dev_check_fp", { p_fp: r.fp }));
    if (result.ok) setCheckRes({ ...result.data, fp: r.fp, kind: r.kind });
  };
  const exportCsv = async () => {
    const result = await saveChange(async () => ({ data: await fetchAll<any>(async (from, to) => {
      const res = await contactsQuery(from, to - from + 1); return { error: res.error, data: res.data?.rows || [], count: res.data?.total };
    }) }));
    if (result.ok) downloadCsv("realhunt-fingerprints.csv", [["fingerprint","kind","shared","country","budget","tag","uploaded_at"], ...result.data.map(l => [l.fp,l.kind,l.shared,l.country,l.budget,l.tag,l.uploaded_at])]);
  };
  const wipe = async () => {
    if (!confirm("Delete all your fingerprints? Existing introductions remain, but prior-contact exemptions may be lost.")) return;
    const result = await saveChange(() => db.from("lead_fingerprints").delete().eq("developer_id", ov.developer.id), "Fingerprints deleted");
    if (result.ok) { setLeads([]); setContactRevision(x => x + 1); await load(); }
  };
  const patchIntro = async (id: string, patch: any) => {
    if (mutation.current) return false; mutation.current = true;
    const result = await saveChange(() => db.rpc("dev_update_intro", { p_id: id, p_patch: patch }), "Saved");
    mutation.current = false;
    if (!result.ok) return false;
    setOpen((x: any) => x?.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x);
    await load(); return true;
  };
  const setStatus = async (i: any, status: string) => {
    if (status === "sold") { setSale(i); setPrice(""); setSaleNote(""); setSaleRes(null); return; }
    if (status === "accepted" && !signed) { nav("/network/agreement"); return; }
    if (await patchIntro(i.id, { status })) track("devapp_status", { meta: { status } });
  };
  const reportSale = async (e: React.FormEvent) => {
    e.preventDefault(); if (!sale || mutation.current) return; mutation.current = true; setBusy(true);
    const result = await saveChange<any>(() => db.rpc("dev_report_sale", { p_intro: sale.id, p_price: Number(price), p_note: saleNote || null }));
    mutation.current = false; setBusy(false);
    if (!result.ok) { setSaleRes({ error: "The sale could not be saved. You can safely retry." }); return; }
    setSaleRes(result.data); track("devapp_sale", { meta: { price: Number(price), exempt: result.data.exempt } }); await load();
  };
  const copy = (t: string, k: string) => { navigator.clipboard?.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1500); }); };

  const shownLeads = leads;
  const approved = ov?.developer?.status === "approved";
  const signed = !!ov?.signed && ov?.developer?.agreement_version === AGREEMENT_VERSION;
  const received: any[] = ov?.received || [];
  const filteredBuyers = received.filter(i => (!buyerQuery || [i.buyer, i.contact, i.buyer_country, i.note, i.dev_notes].some(v => String(v || "").toLowerCase().includes(buyerQuery.toLowerCase()))) && (!followupsOnly || (i.next_action_at && i.next_action_at <= new Date().toISOString().slice(0,10) && !["sold","lost"].includes(i.status))));
  const waiting = received.filter((i) => i.status === "proposed").length;
  const overdue = received.filter((i) => i.next_action_at && new Date(i.next_action_at) < new Date(new Date().toDateString()) && !["sold", "lost"].includes(i.status)).length;
  const active = received.filter((i) => !["sold", "lost"].includes(i.status)).length;

  if (authLoading) return <div className="min-h-screen bg-paper text-ink"><RHNav /><p role="status" className="p-8">Checking your session…</p></div>;

  if (!user) return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[1140px] mx-auto px-4 md:px-6 py-10 md:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-3">RealHunt Network · developer panel</p>
          <h1 className="font-display text-[clamp(32px,4.5vw,46px)] leading-tight tracking-tight">Set up your project. Be ready for the right buyers.</h1>
          <p className="text-[16px] text-ink-muted mt-3 max-w-[54ch]">No cost to join. You pay {COMMISSION_PCT}% only when a buyer we introduce actually buys, and you can earn {SOURCE_SHARE_PCT}% from leads you never managed to close. Here is exactly what happens, in order.</p>
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="border border-hairline rounded-2xl bg-white p-4">
              <p className="font-medium text-[15px]">This is for you if</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-ink-muted">
                <li>You have homes, plots or a development for sale.</li>
                <li>Or you have a list of buyer contacts you never closed.</li>
                <li>You are an agency, a developer or a broker.</li>
              </ul>
            </div>
            <div className="border border-hairline rounded-2xl bg-paper p-4">
              <p className="font-medium text-[15px]">This is not for you if</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px] text-ink-muted">
                <li>You are looking to buy a home for yourself.</li>
                <li>You have nothing to sell and no contacts to share.</li>
              </ul>
              <Link to="/" className="inline-block mt-2 text-[13px] underline">Looking for a home? Start here instead →</Link>
            </div>
          </div>
          <ol className="mt-7 flex flex-col gap-3">
            {[["Sign in", "Free. A link by email or Google, no password to remember."], ["Tell us about your project", "Company, project name, page, country, price from. One minute."], ["Sign the one-page agreement", "You type your name. It says in plain English: 5% only on buyers we bring you who buy, 3% to you when a shared lead of yours buys elsewhere, 0% on buyers you already had."], ["Upload the contacts you already have", "Your CRM export in CSV or TSV format. They are turned into fingerprints in your browser: we never see a name, email or phone. Anything in your list before we introduce it is yours, no commission, ever. This is what protects you, so do it before accepting buyers."], ["Choose what you want", "Only receive buyers, only earn from the leads you share, or both. Separate switches, you can change them any time."], ["Accept buyers and close", "Each buyer arrives in your pipeline with an introduction ID. Accept, get the contact, sell. Report the sale with the price and we settle the rest."]].map(([t, d], i) => (
              <li key={t} className="flex gap-4 border border-hairline rounded-2xl bg-white p-4"><span className="h-8 w-8 shrink-0 rounded-full bg-ink text-paper font-display text-[15px] inline-flex items-center justify-center">{i + 1}</span><span><p className="font-medium text-[15px]">{t}</p><p className="text-[14px] text-ink-muted mt-0.5 leading-relaxed">{d}</p></span></li>
            ))}
          </ol>
        </div>
        <div className="lg:sticky lg:top-24 flex flex-col gap-4">
          <div className="border-2 border-ink rounded-2xl bg-white p-6">
            <p className="font-display text-[24px] tracking-tight">Open your panel</p>
            <p className="text-[14px] text-ink-muted mt-1">Step 1 of 6. Free, no card, no password.</p>
            <button onClick={() => setAuth(true)} className="rh-btn-primary mt-4 w-full inline-flex items-center justify-center gap-2"><Lock size={16} /> Sign in and start</button>
            <p className="text-[12px] text-ink-muted mt-3">Already have a panel? Same button.</p>
          </div>
          <div className="border border-hairline rounded-2xl bg-white p-6">
            <p className="font-display text-[19px] tracking-tight">Two ways to use it. Pick one, or both.</p>
            <div className="mt-3 flex flex-col gap-3 text-[14px]">
              <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-medium">Receive buyers</p><p className="text-ink-muted mt-0.5">We send you buyers. You pay {COMMISSION_PCT}% of the sale only if one buys. €0 if nobody does.</p></div>
              <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-medium">Earn from leads you could not sell to</p><p className="text-ink-muted mt-0.5">Mark old contacts as shared. If one buys another project in the network, you get {SOURCE_SHARE_PCT}% of that sale. You pay nothing.</p></div>
              <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-medium">Just protect my contacts</p><p className="text-ink-muted mt-0.5">Upload without sharing. They are not shared with other developers for introductions. It only proves they were yours, so they stay at 0%.</p></div>
            </div>
            <p className="text-[12px] text-ink-muted mt-3"><Link to="/network/agreement" className="underline">Read the full agreement</Link> · <Link to="/network" className="underline">How the network works</Link></p>
          </div>
        </div>
      </div>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Sign in to your developer panel" subtitle="Free. No password, a link by email or Google." redirect="/network/app" />
    </div>
  );

  if (ov === undefined) return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[1140px] mx-auto px-6 py-16">
        {loadErr ? (
          <div className="border border-hairline rounded-2xl bg-white p-6 max-w-[440px]">
            <p className="font-display text-[20px] tracking-tight">We could not open your panel</p>
            <p className="text-[14px] text-ink-muted mt-1">The connection timed out. Your data is safe — nothing was lost.</p>
            <button onClick={load} className="rh-btn-primary mt-4">Try again</button>
          </div>
        ) : (
          <p className="text-ink-muted inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Opening your panel…</p>
        )}
      </div>
    </div>
  );

  const RegisterForm = (
    <form onSubmit={register} className="border border-hairline rounded-2xl bg-white p-6 md:p-8 grid md:grid-cols-2 gap-4">
      <Field l="Company"><input required className={inp} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
      <Field l="Your name"><input required className={inp} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
      <Field l="Email"><input required type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field l="Phone (optional)"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field l="Project name"><input required className={inp} value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></Field>
      <Field l="Project page"><input required className={inp} placeholder="yourproject.com" value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} /></Field>
      <Field l="Country"><select className={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c} value={c}>{c || "Choose"}</option>)}</select></Field>
      <Field l="Price from (€)"><input type="number" className={inp} value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} /></Field>
      <label className="md:col-span-2 flex items-start gap-3 text-[14px]"><input type="checkbox" className="mt-1" checked={form.share_default} onChange={(e) => setForm({ ...form, share_default: e.target.checked })} /><span>Share my uploaded contacts with the network by default. <span className="text-ink-muted">You can change it per contact later. Shared means RealHunt may introduce that buyer to another project; you earn {SOURCE_SHARE_PCT}% of that sale.</span></span></label>
      <div className="md:col-span-2 flex items-center gap-4"><button disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy && <Loader2 size={16} className="animate-spin" />} {ov ? "Save" : "Create my panel"}</button>{msg && <span className="text-[13px] text-ink-muted">{msg}</span>}</div>
    </form>
  );

  if (ov === null) return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[860px] mx-auto px-6 py-12 flex flex-col gap-6">
        <div><p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">RealHunt Network</p><h1 className="font-display text-[34px] tracking-tight">Tell us about your project. One minute.</h1><p className="text-[15px] text-ink-muted mt-2">Then sign the one-page agreement, upload your contacts, and start receiving buyers. We review every developer by hand before any introduction.</p></div>
        {RegisterForm}
      </div>
    </div>
  );

  // ── buyer card (shared by board and list) ──────────────────────────────────
  const BuyerCard = ({ i, compact }: { i: any; compact?: boolean }) => (
    <button onClick={() => setOpen(i)} className={`text-left w-full border rounded-2xl bg-white p-4 hover:border-ink transition-colors ${i.next_action_at && new Date(i.next_action_at) < new Date(new Date().toDateString()) && !["sold", "lost"].includes(i.status) ? "border-amber-400" : "border-hairline"}`}>
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-[13px]">Buyer {i.buyer}</span>{compact ? <Pill s={i.status} /> : <span className="text-[11px] text-ink-muted">{daysAgo(i.created_at)}d</span>}</div>
      <p className="text-[13px] mt-1.5 line-clamp-2">{i.note || "Fits your country and price."}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
        {i.buyer_country && <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline">{i.buyer_country}</span>}
        {i.buyer_budget && <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline tabular-nums">{eur(i.buyer_budget)}</span>}
        {i.was_mine && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">already yours · 0%</span>}
        {i.from !== "RealHunt" && <span className="px-2 py-0.5 rounded-full bg-paper border border-hairline">via network</span>}
        {i.next_action_at && <span className="inline-flex items-center gap-1"><CalendarClock size={11} /> {fmtD(i.next_action_at)}</span>}
        {i.deal && <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white tabular-nums">{eur(Number(i.deal.sale_price))}</span>}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><nav aria-label="CRM workspaces" className="flex gap-4 text-xs mb-4"><Link to="/network/app/buyers" className="underline">Introduced buyers</Link><Link to="/leads" className="underline">My sales CRM</Link></nav><p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">Developer panel</p><h1 className="font-display text-[30px] md:text-[34px] tracking-tight">{ov.developer.project_name || ov.developer.company}</h1></div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1.5 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 ${signed ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}><FileSignature size={13} /> {signed ? "Agreement signed" : "Agreement not signed"}</span>
            <span className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${approved ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{approved ? "Approved · eligible for introductions" : "Under review · introductions start once approved"}</span>
          </div>
        </div>
        {msg && <p role="status" className="mt-4 rounded-xl border border-hairline bg-white p-4 text-sm">{msg}</p>}
        <div className="mt-6 flex gap-1 overflow-x-auto scrollbar-none border-b border-hairline">{TABS.map(([k, l]) => <Link key={k} to={`/network/app/${k}`} className={`shrink-0 px-4 py-2.5 text-[14px] border-b-2 -mb-px inline-flex items-center gap-1.5 ${tab === k ? "border-ink text-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"}`}>{l}{k === "buyers" && waiting > 0 && <span className="h-5 min-w-5 px-1.5 rounded-full bg-ink text-paper text-[11px] inline-flex items-center justify-center">{waiting}</span>}</Link>)}</div>

        {!signed && tab !== "settings" && (
          <div className="mt-6 border border-amber-400 bg-amber-500/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1"><p className="font-medium text-[15px] inline-flex items-center gap-2"><FileSignature size={16} /> Sign the network agreement to accept buyers</p><p className="text-[13px] text-ink-muted mt-0.5">One page. {COMMISSION_PCT}% only when a buyer we introduce buys, {SOURCE_SHARE_PCT}% to you when a shared lead of yours buys elsewhere. Upload your contacts first so the ones you already have stay yours.</p></div>
            <Link to="/network/agreement" className="rh-btn-primary !px-5 !py-2.5 !text-[14px] inline-flex items-center gap-2">Read and sign <ChevronRight size={14} /></Link>
          </div>
        )}

        {tab === "overview" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi n={active} t="buyers in your pipeline" sub={waiting ? `${waiting} waiting for your answer` : "all answered"} warn={waiting > 0} />
              <Kpi n={eur(Number(ov.sales_total))} t="sold to introduced buyers" sub={`${(ov.deals || []).filter((d: any) => !d.exempt).length} commissionable sales`} />
              <Kpi n={eur(Number(ov.owed))} t="commission owed to RealHunt" sub={Number(ov.owed) ? `${COMMISSION_PCT}% · pay within ${PAYMENT_DAYS} days of invoice` : "nothing due"} warn={Number(ov.owed) > 0} />
              <Kpi n={eur(Number(ov.earned))} t="earned from shared leads" sub={Number(ov.pending_earn) ? `+ ${eur(Number(ov.pending_earn))} pending` : `${SOURCE_SHARE_PCT}% when a shared lead buys elsewhere`} />
            </div>

            {/* onboarding checklist */}
            {!ov.developer.mode && (
              <div className="border-2 border-ink rounded-2xl bg-white p-5 md:p-6">
                <p className="font-display text-[20px] tracking-tight">How do you want to use the network?</p>
                <p className="text-[14px] text-ink-muted mt-1">Pick one. You can change it later in Settings. Uploading your contacts is separate and always a good idea: it is what proves a buyer was already yours.</p>
                <div className="mt-4 grid md:grid-cols-3 gap-3">
                  {[["receive", "Receive buyers only", `We send you buyers. You pay ${COMMISSION_PCT}% only when one buys. Your uploaded contacts stay private.`], ["share", "Earn from my leads only", `You share contacts you could not sell to and earn ${SOURCE_SHARE_PCT}% when one buys elsewhere. You do not receive buyers.`], ["both", "Both (recommended)", `Receive buyers and earn from shared leads. Most developers earn more from sharing than they pay in commission.`]].map(([k, t, d]) => (
                    <button key={k} onClick={() => setMode(k)} className={`text-left rounded-2xl border p-4 hover:border-ink ${k === "both" ? "border-ink" : "border-hairline"}`}><p className="font-medium text-[15px]">{t}</p><p className="text-[13px] text-ink-muted mt-1 leading-relaxed">{d}</p></button>
                  ))}
                </div>
              </div>
            )}
            {(!signed || !ov.leads || !approved || !ov.developer.mode) && (
              <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
                <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Sparkles size={18} /> Get set up</p>
                <ol className="mt-4 grid md:grid-cols-5 gap-3">
                  {[[true, "Project registered", "Done.", ""], [signed, "Sign the agreement", signed ? `v${ov.developer.agreement_version} · ${ov.developer.agreement_signer}` : "One page, typed signature.", "/network/agreement"], [ov.leads > 0, "Upload your contacts", ov.leads > 0 ? `${ov.leads} fingerprints protect your own buyers` : "Anything not uploaded counts as ours if it buys.", "/network/app/upload"], [!!ov.developer.mode, "Choose what you want", ov.developer.mode === "receive" ? "Receive buyers only" : ov.developer.mode === "share" ? "Earn from shared leads only" : ov.developer.mode === "both" ? "Receive and share" : "Receive, share, or both.", ""], [approved, "Get approved", approved ? "Receiving buyers." : "Manual review pending.", ""]].map(([ok, t, d, to]: any, n) => (
                    <li key={t} className={`rounded-xl border p-4 ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-hairline"}`}><p className="text-[13px] font-medium inline-flex items-center gap-2">{ok ? <Check size={14} className="text-emerald-600" /> : <span className="h-4 w-4 rounded-full border border-ink-muted inline-flex items-center justify-center text-[10px]">{n + 1}</span>}{t}</p><p className="text-[12px] text-ink-muted mt-1">{d}</p>{!ok && to && <Link to={to} className="text-[12px] underline text-ink mt-1 inline-block">Do it →</Link>}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-3">
              <Link to="/network/app/buyers" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Handshake size={18} /> <span><b>{received.length} buyers received</b><br /><span className="text-[13px] text-ink-muted">{waiting ? `${waiting} waiting for your answer` : overdue ? `${overdue} follow-ups overdue` : "pipeline up to date"}</span></span></span><ChevronRight size={16} /></Link>
              <Link to="/network/app/upload" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Upload size={18} /> <span><b>{ov.leads} contacts protected</b><br /><span className="text-[13px] text-ink-muted">{ov.overlap_realhunt} are active RealHunt buyers</span></span></span><ChevronRight size={16} /></Link>
              <Link to="/network/app/deals" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Receipt size={18} /> <span><b>{(ov.deals || []).length} deals reported</b><br /><span className="text-[13px] text-ink-muted">{Number(ov.paid_total) ? `${eur(Number(ov.paid_total))} commission paid` : "report a sale when it closes"}</span></span></span><ChevronRight size={16} /></Link>
            </div>
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div><p className="font-display text-[20px] tracking-tight">The network right now</p><p className="text-[14px] text-ink-muted mt-1"><b className="text-ink">{ov.network_developers}</b> approved developers · <b className="text-ink">{ov.network_leads}</b> fingerprinted leads · <b className="text-ink">{ov.network_shared}</b> shared · <b className="text-ink">{ov.rh_buyers}</b> RealHunt buyers</p></div>
              <div className="flex items-end gap-1 h-14">{(ov.by_month || []).slice(-8).map((m: any) => { const mx = Math.max(1, ...ov.by_month.map((x: any) => x.n)); return <div key={m.m} title={`${m.m}: ${m.n}`} className="w-5 bg-ink rounded-t" style={{ height: `${Math.max(6, (m.n / mx) * 100)}%` }} />; })}</div>
            </div>
          </div>
        )}

        {tab === "buyers" && (
          <div className="mt-6 flex flex-col gap-4">
            {!approved && <div className="border border-amber-500/40 bg-amber-500/5 rounded-2xl p-5 text-[14px]">We are reviewing your project. Introductions become available after approval and agreement signature. Upload your existing contacts before accepting introductions.</div>}
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] text-ink-muted">{received.length} buyers · {active} active{overdue ? <span className="text-amber-700"> · {overdue} overdue</span> : ""}</p>
              <span className="flex-1" />
              <div className="inline-flex border border-hairline rounded-full bg-white p-0.5">{(["board", "list"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-full text-[12px] inline-flex items-center gap-1.5 ${view === v ? "bg-ink text-paper" : "text-ink-muted"}`}>{v === "board" ? <LayoutGrid size={13} /> : <List size={13} />}{v}</button>)}</div>
            </div>
            <div className="flex flex-wrap gap-3"><input aria-label="Search all introduced buyers" placeholder="Search buyer, country or notes" value={buyerQuery} onChange={e => { setBuyerQuery(e.target.value); setBuyerLimit(30); }} className={`${inp} flex-1`} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={followupsOnly} onChange={e => setFollowupsOnly(e.target.checked)} />Follow-ups due</label></div>
            {received.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">No buyers introduced yet. New introductions appear here, with notifications sent to {ov.developer.email}.</div> : view === "board" ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {STAGES.map((s) => { const col = filteredBuyers.filter((i) => i.status === s); return (
                  <div key={s} className="shrink-0 w-[260px] rounded-2xl bg-hairline/30 p-2.5">
                    <div className="flex items-center justify-between px-1.5 pb-2"><span className="text-[12px] font-medium">{STATUS[s]}</span><span className="text-[11px] text-ink-muted tabular-nums">{col.length}</span></div>
                    <div className="flex flex-col gap-2">{col.slice(0, buyerLimit).map((i) => <BuyerCard key={i.id} i={i} />)}{col.length === 0 && <div className="rounded-xl border border-dashed border-hairline h-16" />}</div>
                  </div>); })}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{filteredBuyers.slice(0, buyerLimit).map((i) => <BuyerCard key={i.id} i={i} compact />)}</div>
            )}
            {filteredBuyers.length > buyerLimit && <button onClick={() => setBuyerLimit(n => n + 30)} className="min-h-11 underline text-sm">Show more buyers</button>}
            <p className="text-[12px] text-ink-muted">Accept and we send you the buyer's contact. Keep the status honest: it is what the sharing developer gets paid on, and how we send you better fits. A sale is reported with its price from the buyer's card.</p>
          </div>
        )}

        {tab === "upload" && (
          <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="flex flex-col gap-4">
              <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
                <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /> Your contacts never leave this browser</p>
                <p className="text-[14px] text-ink-muted mt-1">Drop a CSV or paste emails and phones. Each one becomes a one-way fingerprint here, on your machine, and only the fingerprint is sent. Raw contact details are not uploaded. Fingerprints are used for matching and should still be treated as sensitive data. <b className="text-ink">A contact uploaded before we introduce it is yours: no commission, ever.</b></p>
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }} onClick={() => fileRef.current?.click()} className="mt-4 border-2 border-dashed border-hairline hover:border-ink rounded-2xl p-8 text-center cursor-pointer">
                  <Upload size={22} className="mx-auto text-ink-muted" /><p className="text-[14px] mt-2">Drop a CSV exported from your CRM or Excel, or click to choose</p><p className="text-[12px] text-ink-muted mt-1">Any column layout. We only pick up emails and phone numbers.</p>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"or paste here, one per line:\nmaria@gmail.com\n+34 600 123 456"} className={`${inp} mt-3 w-full h-28 rounded-2xl font-mono text-[13px]`} />
                <div className="mt-3 flex items-center gap-3"><button onClick={() => { setUpRes(null); setProg(1); parse(raw); }} disabled={busy || !raw.trim()} className="px-4 py-2 rounded-full border border-ink text-[14px] font-medium disabled:opacity-40">Fingerprint pasted text</button>{prog > 0 && prog < 100 && <span className="text-[13px] text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> hashing {prog}%</span>}</div>
              </div>
              {(importIssues.length > 0 || importDuplicates > 0) && <div className="border border-amber-300 rounded-2xl p-4 text-sm" role="status"><p>{importDuplicates} duplicate contacts removed. {importIssues.length} rows need attention.</p>{importIssues.slice(0, 10).map((issue,n) => <p key={n}>Row {issue.row}: {issue.message}</p>)}</div>}
              {rows.length > 0 && (
                <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
                  <p className="font-display text-[20px] tracking-tight">{rows.length} contacts ready · {rows.filter((r) => r.kind === "email").length} emails, {rows.filter((r) => r.kind === "phone").length} phones</p>
                  <table className="w-full mt-3 text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left py-1">Stays here</th><th className="text-left py-1">What we receive</th></tr></thead><tbody>{rows.slice(0, 3).map((r) => <tr key={r.fp} className="border-t border-hairline/70"><td className="py-1.5 pr-3 text-ink-muted">{r.raw}</td><td className="py-1.5 font-mono">{mask(r.fp)}</td></tr>)}{rows.length > 3 && <tr className="border-t border-hairline/70"><td className="py-1.5 text-ink-muted" colSpan={2}>… and {rows.length - 3} more</td></tr>}</tbody></table>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    <Field l="Country they asked about"><select className={inp} value={upOpts.country} onChange={(e) => setUpOpts({ ...upOpts, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c} value={c}>{c || "Any / unknown"}</option>)}</select></Field>
                    <Field l="Typical budget (€)"><input type="number" className={inp} placeholder="150000" value={upOpts.budget} onChange={(e) => setUpOpts({ ...upOpts, budget: e.target.value })} /></Field>
                    <Field l="Tag"><input className={inp} placeholder="expo-2025, cold, visited…" value={upOpts.tag} onChange={(e) => setUpOpts({ ...upOpts, tag: e.target.value })} /></Field>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <button type="button" onClick={() => setUpOpts({ ...upOpts, shared: false })} className={`text-left rounded-2xl border-2 p-4 ${!upOpts.shared ? "border-ink bg-paper" : "border-hairline"}`}><p className="font-medium text-[15px] inline-flex items-center gap-2"><ShieldCheck size={16} /> Just protect these contacts</p><p className="text-[13px] text-ink-muted mt-1 leading-relaxed">Private. They are not shared with other developers for introductions. If we ever send you one of these people, the sale is exempt: 0%.</p></button>
                    <button type="button" onClick={() => setUpOpts({ ...upOpts, shared: true })} className={`text-left rounded-2xl border-2 p-4 ${upOpts.shared ? "border-ink bg-paper" : "border-hairline"}`}><p className="font-medium text-[15px] inline-flex items-center gap-2"><BadgeEuro size={16} /> Protect and share, earn {SOURCE_SHARE_PCT}%</p><p className="text-[13px] text-ink-muted mt-1 leading-relaxed">Same protection, plus: if one of them buys another project in the network, you get {SOURCE_SHARE_PCT}% of that sale. Still nobody sees the contact. You can un-share any contact later.</p></button>
                  </div>
                  <div className="mt-4 flex items-center gap-3"><button onClick={send} disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />} Send {rows.length} fingerprints</button><button onClick={() => { setRows([]); setRaw(""); }} className="text-[13px] text-ink-muted underline">Clear</button></div>
                </div>
              )}
              {upRes && <div className="border border-emerald-500/40 bg-emerald-500/5 rounded-2xl p-5 text-[14px]"><p className="font-medium inline-flex items-center gap-2"><Check size={16} /> Done. These contacts are now protected.</p><p className="mt-1"><b>{upRes.inserted}</b> new · <b>{upRes.duplicates}</b> already in your list · <b>{upRes.overlap_realhunt}</b> of all your leads are active RealHunt buyers · <b>{upRes.overlap_network}</b> are also with another developer.</p></div>}
              {msg && <p className="text-[13px] text-red-600">{msg}</p>}
            </div>
            <aside className="flex flex-col gap-3">
              <div className="border border-hairline rounded-2xl bg-white p-5"><p className="font-medium text-[15px] inline-flex items-center gap-2"><Search size={16} /> Is this contact known?</p><p className="text-[13px] text-ink-muted mt-1">Type an email or phone. It is fingerprinted here and only the fingerprint is checked.</p>
                <form onSubmit={check} className="mt-3 flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name@mail.com" className={`${inp} flex-1 min-w-0`} /><button className="px-4 rounded-xl border border-ink text-[13px] font-medium">Check</button></form>
                {checkRes && (checkRes.restricted ? <p className="text-sm">Upload this contact to your own list before checking matches.</p> : checkRes.bad ? <p className="text-[13px] text-red-600 mt-2">Not an email or phone.</p> : <ul className="mt-3 text-[13px] flex flex-col gap-1"><li>{checkRes.mine ? "✓ In your list, protected" : "· Not in your list"}</li><li>{checkRes.realhunt ? "✓ Active RealHunt buyer" : "· Not a RealHunt buyer yet"}</li><li>{Number(checkRes.network) > 0 ? `✓ With ${checkRes.network} other developer${checkRes.network > 1 ? "s" : ""}` : "· No other developer has them"}</li><li>{Number(checkRes.introduced) > 0 ? `✓ Introduced ${checkRes.introduced}×` : "· Never introduced"}</li></ul>)}
              </div>
              <div className="border border-hairline rounded-2xl bg-white p-5 text-[13px] text-ink-muted"><p className="font-medium text-ink text-[15px]">What a fingerprint looks like</p><p className="mt-2 font-mono break-all text-[12px]">{"a8f09af9fc6af1a5…fd0e06d1"}</p><p className="mt-2">64 characters, one way. Same contact → same fingerprint, on every developer's machine. That is how we know a buyer was already yours without anyone seeing a name.</p></div>
            </aside>
          </div>
        )}

        {tab === "leads" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "shared", "private"] as const).map((k) => <button key={k} onClick={() => setOnlyShared(k)} className={`px-3.5 py-2 rounded-full border text-[13px] ${onlyShared === k ? "bg-ink text-paper border-ink" : "border-hairline bg-white"}`}>{k === "all" ? `All (${ov.leads})` : k === "shared" ? `Shared (${ov.shared})` : `Private (${ov.leads - ov.shared})`}</button>)}
              <span className="flex-1" />
              <button onClick={() => setShared(shownLeads.map((l) => l.id), true)} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px]">Share all shown</button>
              <button onClick={() => setShared(shownLeads.map((l) => l.id), false)} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px]">Make all shown private</button>
              <button onClick={exportCsv} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px] inline-flex items-center gap-1.5"><Download size={14} /> Export</button>
            </div>
            <input aria-label="Search all contacts" placeholder="Search country, tag or fingerprint" className={inp} value={contactQuery} onChange={e => setContactQuery(e.target.value)} />
            {contactError ? <button onClick={() => setContactRevision(x => x + 1)} className="min-h-11 underline">Contacts could not load. Retry</button> : contactLoading ? <p role="status">Loading contacts…</p> : leads.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">No contacts match this view. <Link to="/network/app/upload" className="underline text-ink">Upload your first batch</Link> so the buyers you already have stay yours.</div> : (
              <div className="border border-hairline rounded-2xl bg-white overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left px-4 py-2.5">Fingerprint</th><th className="text-left px-3 py-2.5">Kind</th><th className="text-left px-3 py-2.5">Country</th><th className="text-left px-3 py-2.5">Budget</th><th className="text-left px-3 py-2.5">Tag</th><th className="text-left px-3 py-2.5">Uploaded</th><th className="text-left px-3 py-2.5">Shared</th></tr></thead>
                <tbody>{shownLeads.map((l) => <tr key={l.id} className="border-t border-hairline/70"><td className="px-4 py-2 font-mono">{mask(l.fp)}</td><td className="px-3 py-2 text-ink-muted">{l.kind}</td><td className="px-3 py-2">{l.country || "—"}</td><td className="px-3 py-2 tabular-nums">{l.budget ? eur(l.budget) : "—"}</td><td className="px-3 py-2 text-ink-muted">{l.tag || "—"}</td><td className="px-3 py-2 text-ink-muted">{fmtD(l.uploaded_at)}</td><td className="px-3 py-2"><button onClick={() => setShared([l.id], !l.shared)} aria-label="Toggle share">{l.shared ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} className="text-ink-muted" />}</button></td></tr>)}</tbody></table>
                </div>
            )}
          </div>
        )}

        {tab === "leads" && <Pagination page={contactPage} total={contactTotal} onChange={setContactPage} busy={contactLoading} />}

        {tab === "deals" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi n={eur(Number(ov.sales_total))} t="sold to introduced buyers" />
              <Kpi n={eur(Number(ov.owed))} t="commission owed" sub={`${COMMISSION_PCT}% of commissionable sales`} warn={Number(ov.owed) > 0} />
              <Kpi n={eur(Number(ov.paid_total))} t="commission paid" />
              <Kpi n={(ov.deals || []).filter((d: any) => d.exempt).length} t="exempt sales" sub="buyers you had before the introduction" />
            </div>
            <div className="border border-hairline rounded-2xl bg-white p-5 text-[14px] flex flex-col md:flex-row md:items-center gap-3"><BadgeEuro size={20} className="text-ink-muted shrink-0" /><p className="flex-1">A sale is reported from the buyer's card in <Link to="/network/app/buyers" className="underline">Buyers</Link>: set the price and we calculate the rest. If the fingerprint was in your list before we introduced the buyer, the sale is exempt automatically. Otherwise we invoice {COMMISSION_PCT}%, payable in {PAYMENT_DAYS} days.</p></div>
            {(ov.deals || []).length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">No sales reported yet.</div> : (
              <div className="border border-hairline rounded-2xl bg-white overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left px-4 py-2.5">Buyer</th><th className="text-left px-3 py-2.5">Sale price</th><th className="text-left px-3 py-2.5">Commission</th><th className="text-left px-3 py-2.5">Status</th><th className="text-left px-3 py-2.5">Reported</th><th className="text-left px-3 py-2.5">Invoiced</th><th className="text-left px-3 py-2.5">Paid</th><th className="text-left px-3 py-2.5">Note</th></tr></thead><tbody>
                {ov.deals.map((d: any) => <tr key={d.id} className="border-t border-hairline/70"><td className="px-4 py-2 font-mono">{d.buyer}…<br /><span className="font-sans text-[11px] text-ink-muted">{d.from === "RealHunt" ? "from RealHunt" : "via network"}</span></td><td className="px-3 py-2 tabular-nums">{eur(Number(d.sale_price))}</td><td className="px-3 py-2 tabular-nums">{d.exempt ? <span className="text-emerald-700">€0 · exempt</span> : <>{eur(Number(d.commission_eur))} <span className="text-ink-muted">({d.commission_pct}%)</span></>}{d.exempt_reason && <p className="text-[11px] text-ink-muted">{d.exempt_reason}</p>}</td><td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[11px] ${d.status === "paid" ? "bg-emerald-500/10 text-emerald-700" : d.status === "invoiced" ? "bg-amber-500/10 text-amber-700" : d.status === "void" ? "bg-hairline text-ink-muted" : "bg-ink text-paper"}`}>{d.status}</span></td><td className="px-3 py-2 text-ink-muted">{fmtD(d.reported_at)}</td><td className="px-3 py-2 text-ink-muted">{fmtD(d.invoiced_at) || "—"}</td><td className="px-3 py-2 text-ink-muted">{fmtD(d.paid_at) || "—"}</td><td className="px-3 py-2 text-ink-muted">{d.notes || "—"}</td></tr>)}
              </tbody></table></div>
            )}
          </div>
        )}

        {tab === "earnings" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi n={eur(Number(ov.earned))} t="paid to you" sub="shared leads that bought elsewhere" /><Kpi n={eur(Number(ov.pending_earn))} t="pending" sub="waiting for the selling developer to pay" /><Kpi n={(ov.given || []).length} t="introductions from your leads" /><Kpi n={`${SOURCE_SHARE_PCT}%`} t="of the sale price" sub={`paid within ${PAYMENT_DAYS} days of RealHunt collecting`} /></div>
            {(ov.given || []).length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">Nothing yet. Share leads and this fills up when one of them fits another project.</div> : (
              <div className="border border-hairline rounded-2xl bg-white overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left px-4 py-2.5">Buyer</th><th className="text-left px-3 py-2.5">Introduced to</th><th className="text-left px-3 py-2.5">Status</th><th className="text-left px-3 py-2.5">Your share</th><th className="text-left px-3 py-2.5">When</th></tr></thead><tbody>{ov.given.map((g: any) => <tr key={g.id} className="border-t border-hairline/70"><td className="px-4 py-2 font-mono">{g.buyer}…</td><td className="px-3 py-2">{g.to}</td><td className="px-3 py-2"><Pill s={g.status} /></td><td className="px-3 py-2 tabular-nums">{g.share_eur ? <>{eur(Number(g.share_eur))} <span className="text-ink-muted text-[11px]">{g.share_status === "paid" ? "paid" : "pending"}</span></> : <span className="text-ink-muted">—</span>}</td><td className="px-3 py-2 text-ink-muted">{fmtD(g.created_at)}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-6 flex flex-col gap-4">
            {RegisterForm}
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6"><p className="font-medium text-[15px]">What you want from the network</p><p className="text-[13px] text-ink-muted mt-0.5">Separate from uploading: uploading always protects you. This only decides whether we send you buyers and whether your new uploads are shared by default.</p><div className="mt-3 flex flex-wrap gap-2">{[["receive", "Receive buyers only"], ["share", "Earn from my leads only"], ["both", "Both"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`px-4 py-2 rounded-full border text-[13px] ${ov.developer.mode === k ? "bg-ink text-paper border-ink" : "border-hairline bg-white hover:border-ink"}`}>{l}</button>)}</div></div>
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><p className="font-medium text-[15px] inline-flex items-center gap-2"><FileSignature size={15} /> Network agreement</p><p className="text-[13px] text-ink-muted">{signed ? `Signed v${ov.developer.agreement_version} by ${ov.developer.agreement_signer} on ${new Date(ov.developer.agreement_accepted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.` : "Not signed yet. Needed before you can accept buyers."}</p></div><Link to="/network/agreement" className="px-4 py-2 rounded-full border border-ink text-[13px] font-medium">{signed ? "Read my copy" : "Read and sign"}</Link></div>
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><p className="font-medium text-[15px]">Delete all my fingerprints</p><p className="text-[13px] text-ink-muted">Removes every fingerprint you uploaded. Introductions already made are kept for accounting, and buyers you had stop being exempt.</p></div><button onClick={wipe} className="px-4 py-2 rounded-full border border-red-600 text-red-600 text-[13px] font-medium inline-flex items-center gap-1.5"><Trash2 size={14} /> Delete all</button></div>
          </div>
        )}

        {tab === "privacy" && (
          <div className="mt-6 grid md:grid-cols-2 gap-4 text-[14px] leading-relaxed">
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">I am not handing my database to a competitor.</p><p className="mt-2 text-ink-muted">Right. So you never hand it to anyone. Each email or phone is turned into a 64-character fingerprint in your browser. Fingerprints let us match contacts without uploading the original details; they are still sensitive. We store fingerprints, a country, a budget and a tag. Never a name, never an email, never a phone.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">The {COMMISSION_PCT}% rule</p><p className="mt-2 text-ink-muted">We introduce a buyer, you sell, you pay {COMMISSION_PCT}% of the price. If that buyer's fingerprint was already in your panel before we introduced them, it is exempt, automatically. If you had them but never uploaded, they count as ours. That is the whole reason to upload first.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">The {SOURCE_SHARE_PCT}% rule</p><p className="mt-2 text-ink-muted">A lead you marked as shared buys another project in the network through an introduction. The selling developer pays {COMMISSION_PCT}% of the sale to RealHunt, and only that: out of it, {SOURCE_SHARE_PCT}% of the sale goes to you within {PAYMENT_DAYS} days and {COMMISSION_PCT - SOURCE_SHARE_PCT}% stays with RealHunt. You pay nothing to share. Private leads are never introduced.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">Wait, then how do you contact the buyer?</p><p className="mt-2 text-ink-muted">We don't, from a fingerprint. When a match is accepted we ask you, the developer who owns the relationship, for that one contact, or the buyer is already a RealHunt user who asked us to find them a home. Either way, consent first. Operated by Equinox Investment Group LLC, Sheridan, Wyoming. <Link to="/network/agreement" className="underline text-ink">Full agreement</Link>.</p></div>
          </div>
        )}
      </div>

      {/* buyer drawer */}
      {open && (() => { const i = received.find((x) => x.id === open.id) || open; return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setOpen(null)}>
          <div className="absolute inset-0 bg-ink/30" />
          <aside onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[440px] h-full bg-paper border-l border-hairline overflow-y-auto p-5 md:p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Buyer</p><p className="font-display text-[26px] tracking-tight font-mono">{i.buyer}</p><p className="text-[13px] text-ink-muted">Introduced {fmtD(i.created_at)} · {i.from}{i.was_mine ? " · already in your list, exempt" : ""}</p></div><button onClick={() => setOpen(null)} className="h-9 w-9 rounded-full border border-hairline inline-flex items-center justify-center" aria-label="Close"><X size={16} /></button></div>
            <div className="flex flex-wrap items-center gap-2"><Pill s={i.status} />{i.buyer_country && <span className="px-2 py-0.5 rounded-full bg-white border border-hairline text-[11px]">{i.buyer_country}</span>}{i.buyer_budget && <span className="px-2 py-0.5 rounded-full bg-white border border-hairline text-[11px] tabular-nums">budget {eur(i.buyer_budget)}</span>}</div>
            {i.note && <div className="border border-hairline rounded-2xl bg-white p-4 text-[14px]"><p className="text-[11px] uppercase tracking-wider text-ink-muted mb-1">From RealHunt</p>{i.note}</div>}

            {/* contact */}
            <div className="border border-hairline rounded-2xl bg-white p-4">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">Contact</p>
              {i.contact ? (
                <div className="flex flex-col gap-2 text-[14px]">{i.contact.split(/\s*[|\n]\s*/).filter(Boolean).map((c: string) => { const isMail = /@/.test(c); const isTel = /^[+\d][\d\s().-]{6,}$/.test(c); return <div key={c} className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 min-w-0">{isMail ? <Mail size={14} className="text-ink-muted shrink-0" /> : isTel ? <Phone size={14} className="text-ink-muted shrink-0" /> : null}<span className="truncate">{c}</span></span><span className="flex gap-1 shrink-0">{isMail && <a href={`mailto:${c}`} className="px-2 py-1 rounded-full border border-hairline text-[12px]">Email</a>}{isTel && <a href={`https://wa.me/${c.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-full border border-hairline text-[12px]">WhatsApp</a>}<button onClick={() => copy(c, c)} className="px-2 py-1 rounded-full border border-hairline text-[12px] inline-flex items-center gap-1"><Copy size={11} /> {copied === c ? "Copied" : "Copy"}</button></span></div>; })}</div>
              ) : i.status === "proposed" ? (
                <p className="text-[13px] text-ink-muted">Accept the introduction and the contact appears here. {!signed && <Link to="/network/agreement" className="underline text-ink">Sign the agreement first.</Link>}</p>
              ) : <p className="text-[13px] text-ink-muted">Contact details are pending. They will appear here when RealHunt adds them.</p>}
            </div>

            {/* stage */}
            <div className="border border-hairline rounded-2xl bg-white p-4">
              <p className="text-[11px] uppercase tracking-wider text-ink-muted mb-2">Move to</p>
              <div className="flex flex-wrap gap-1.5">{(NEXT[i.status] || []).map((s) => <button key={s} onClick={() => setStatus(i, s)} disabled={s === "accepted" && !signed && i.status === "proposed"} className={`px-3 py-1.5 rounded-full border text-[12px] disabled:opacity-40 ${s === "sold" ? "bg-emerald-600 border-emerald-600 text-white" : s === "lost" ? "border-hairline text-ink-muted hover:border-ink" : "bg-ink border-ink text-paper"}`}>{s === "accepted" && i.status === "proposed" ? "Accept, send me the contact" : s === "lost" && i.status === "proposed" ? "Not for us" : s === "sold" ? "Mark sold, report price" : STATUS[s]}</button>)}{i.status === "sold" && i.deal && <span className="text-[13px] text-emerald-700 inline-flex items-center gap-1"><Check size={14} /> Sold for {eur(Number(i.deal.sale_price))} · {i.deal.exempt ? "exempt" : `${eur(Number(i.deal.commission_eur))} commission · ${i.deal.status}`}</span>}</div>
              {i.status === "proposed" && !signed && <p className="text-[12px] text-amber-700 mt-2 inline-flex items-center gap-1"><AlertTriangle size={12} /> Sign the agreement to accept buyers.</p>}
            </div>

            {/* follow up + notes */}
            <div className="border border-hairline rounded-2xl bg-white p-4 flex flex-col gap-3">
              <Field l="Next follow-up"><input type="date" className={inp} value={i.next_action_at || ""} onChange={(e) => patchIntro(i.id, { next_action_at: e.target.value || null })} /></Field>
              <Field l="Your notes (visible to you and RealHunt support)"><textarea defaultValue={i.dev_notes || ""} onBlur={(e) => e.target.value !== (i.dev_notes || "") && patchIntro(i.id, { dev_notes: e.target.value })} placeholder="Called Tue, wants sea view, visiting in March…" className={`${inp} h-28 rounded-2xl`} /></Field>
            </div>
            <BuyerHistory id={i.id} revision={i.updated_at} />
            <p className="text-[12px] text-ink-muted">Introduction ID {i.id.slice(0, 8)}. Every status change is logged; it is what the agreement is settled on.</p>
          </aside>
        </div>); })()}

      {/* report sale modal */}
      {sale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setSale(null)}>
          <div className="absolute inset-0 bg-ink/40" />
          <form onSubmit={reportSale} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[460px] bg-paper rounded-2xl border border-hairline p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between"><div><p className="font-display text-[24px] tracking-tight">Report the sale</p><p className="text-[13px] text-ink-muted">Buyer {sale.buyer} · introduced {fmtD(sale.created_at)}</p></div><button type="button" onClick={() => setSale(null)} className="h-9 w-9 rounded-full border border-hairline inline-flex items-center justify-center" aria-label="Close"><X size={16} /></button></div>
            {!saleRes && (<>
              <Field l="Total price paid by the buyer (€, before taxes and discounts)"><input required type="number" min={1} step={1} autoFocus value={price} onChange={(e) => setPrice(e.target.value)} placeholder="185000" className={`${inp} text-[18px] font-display`} /></Field>
              <Field l="Unit, reference or note (optional)"><input value={saleNote} onChange={(e) => setSaleNote(e.target.value)} placeholder="Villa B4, reserved 12 Sep" className={inp} /></Field>
              <div className="rounded-xl bg-white border border-hairline p-4 text-[13px]">{sale.was_mine ? <p className="text-emerald-700 inline-flex items-center gap-2"><ShieldCheck size={14} /> This buyer was in your list before the introduction. The sale will be recorded as exempt, €0 commission.</p> : <p>Commission at {COMMISSION_PCT}%: <b className="tabular-nums">{price ? eur(Number(price) * COMMISSION_PCT / 100) : "€0"}</b>. We send the invoice; payable in {PAYMENT_DAYS} days.</p>}</div>
              <button disabled={busy || !price} className="rh-btn-primary inline-flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />} Confirm sale</button>
              <p className="text-[12px] text-ink-muted">By confirming you declare this sale under the network agreement v{ov.developer.agreement_version || AGREEMENT_VERSION}.</p>
            </>)}
            {saleRes && (saleRes.error ? <p className="text-[14px] text-red-600">{saleRes.error}</p> : (
              <div className="flex flex-col gap-3"><p className="text-[15px] inline-flex items-center gap-2"><Check size={18} className="text-emerald-600" /> Recorded. Sold for {eur(Number(saleRes.sale_price))}.</p><p className="text-[14px]">{saleRes.exempt ? "Exempt: the buyer was already yours. Nothing to pay." : `Commission ${eur(Number(saleRes.commission_eur))}. You will get the invoice by email; it also shows under Deals & commission.`}</p><button type="button" onClick={() => { setSale(null); setOpen(null); }} className="rh-btn-primary self-start">Done</button></div>
            ))}
          </form>
        </div>
      )}
    </div>
  );
};
export default NetworkApp;

