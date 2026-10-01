// Buyer ↔ developer chat inside RealHunt. Every message stays attached to the introduction, which is what the
// agreement is settled on. In-app only: nobody gets an email from here.
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, MessageCircle } from "lucide-react";

const rpc = async (fn: string, args: Record<string, unknown>) => { const { data, error } = await (supabase as any).rpc(fn, args); if (error) throw error; return data; };
const WHO: Record<string, string> = { buyer: "Buyer", developer: "Developer", agent: "Agent", realhunt: "RealHunt" };

export default function IntroChat({ id, compact = false }: { id: string; compact?: boolean }) {
  const [t, setT] = useState<any>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const load = () => rpc("intro_thread", { p_intro: id }).then((d) => { setT(d); setErr(d?.error || ""); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); const h = setInterval(load, 20000); return () => clearInterval(h); }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [t?.messages?.length]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!body.trim()) return; setBusy(true);
    try { const r = await rpc("intro_send", { p_intro: id, p_body: body }); if (r?.error) setErr(r.error); else { setBody(""); try { (window as any).clarity?.("event", "chat_send"); } catch { /* ignore */ } await load(); } }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  if (!t && !err) return <div className="p-4"><Loader2 size={16} className="animate-spin" /></div>;
  if (err && !t?.messages) return <p className="text-[13px] text-ink-muted">{err}</p>;
  const msgs: any[] = t.messages || [];
  return (
    <div className="border border-hairline rounded-2xl bg-white p-4 flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5"><MessageCircle size={13} /> Messages{t.role !== "developer" && t.developer ? ` with ${t.developer}` : ""}</p>
      <div className={`flex flex-col gap-2 overflow-y-auto ${compact ? "max-h-[260px]" : "max-h-[420px]"}`}>
        {msgs.length === 0 && <p className="text-[13px] text-ink-muted">{t.role === "developer" ? "Write to the buyer here. They see it in their RealHunt inbox." : "Ask anything here. The developer sees it in their RealHunt panel."}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] whitespace-pre-wrap ${m.mine ? "self-end bg-ink text-paper" : "self-start bg-[#ECEDEF]"}`}>
            {!m.mine && <p className="text-[11px] opacity-70">{WHO[m.role] || m.role}</p>}
            {m.body}
            <p className="text-[10px] opacity-60 mt-0.5">{new Date(m.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }} rows={2} placeholder="Write a message…" className="flex-1 px-3 py-2 rounded-xl border border-hairline text-[14px] resize-none" />
        <button disabled={busy || !body.trim()} className="self-end h-10 w-10 rounded-full bg-ink text-paper inline-flex items-center justify-center disabled:opacity-40" aria-label="Send">{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
      </form>
      {err && <p className="text-[12px] text-red-700">{err}</p>}
      <p className="text-[11px] text-ink-muted">Messages stay in RealHunt so both sides have a record of the introduction.</p>
    </div>
  );
}
