import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import { Check, Upload } from "lucide-react";
import { db, track, COSTS } from "@/lib/rh";

const Sell = () => {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", email: "", country: "Italy", location: "", price: "", description: "", contact: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { document.title = "Sell your home under €60,000 · RealHunt"; track("sell_view"); }, []);
  const inp = "border border-hairline rounded-full px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink w-full";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const em = user?.email || f.email; if (!/.+@.+\..+/.test(em)) return; if (Number(f.price) > 100000) { setErr("We only list homes under €60,000."); return; } if (!files.length) { setErr("Add at least one photo."); return; }
    setBusy(true); setErr("");
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, 8)) {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9.]+/g, "-")}`;
        const { error } = await supabase.storage.from("submissions").upload(path, file, { contentType: file.type });
        if (error) throw error;
        urls.push(supabase.storage.from("submissions").getPublicUrl(path).data.publicUrl);
      }
      await db.from("submissions").insert({ user_id: user?.id || null, email: em, name: f.name, country: f.country, location: f.location, price_eur: Number(f.price) || null, description: f.description, contact: f.contact, image_urls: urls });
      track("sell_submit"); setSent(true);
    } catch (x: any) { setErr(x?.message || "Something failed, try again."); }
    setBusy(false);
  };
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[720px] mx-auto px-4 md:px-6 py-10">
        <h1 className="font-display text-[clamp(30px,5vw,46px)] leading-[1.05] tracking-tight">Selling a home under €60,000? List it here, free.</h1>
        <p className="mt-3 text-[16px] text-ink-muted">We review every submission by hand. If it is real and the price is right, it goes in front of thousands of buyers looking for exactly this. You pay nothing to list. If a buyer we introduce completes the purchase, we agree a commission with you in writing before any contact is shared.</p>
        {sent ? <p className="mt-8 inline-flex items-center gap-2 text-[16px]"><Check size={20} /> Received. We reply within 48 hours with a yes, a no, or a question.</p> : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Your name" className={inp} />
              {!user && <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" className={inp} />}
              <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className={inp}>{Object.keys(COSTS).filter((c) => c !== "Indonesia").map((c) => <option key={c}>{c}</option>)}</select>
              <input required value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Town, region" className={inp} />
              <input required type="number" min={1000} max={100000} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="Asking price in €" className={inp} />
              <input value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} placeholder="WhatsApp or phone, optional" className={inp} />
            </div>
            <textarea required rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Size, rooms, condition, what needs work, why you are selling" className="border border-hairline rounded-2xl px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink resize-none" />
            <label className="border border-dashed border-hairline rounded-2xl p-6 text-center cursor-pointer hover:border-ink"><Upload size={20} className="mx-auto text-ink-muted" /><p className="text-[14px] mt-2">{files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} selected` : "Add photos (up to 8). Real photos, no renders."}</p><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>
            {err && <p className="text-[13px] text-red-600">{err}</p>}
            <button disabled={busy} className="rh-btn-primary self-start disabled:opacity-60">{busy ? "Uploading…" : "Submit for review"}</button>
            <p className="text-[12px] text-ink-muted">By submitting you confirm you own the home or are authorised to sell it, that the photos are yours, and you accept our <Link to="/legal/terms" className="underline">terms</Link>.</p>
          </form>
        )}
      </div>
    </div>
  );
};
export default Sell;
