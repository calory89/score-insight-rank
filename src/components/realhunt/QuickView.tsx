import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, ExternalLink, Heart, GitCompareArrows, X } from "lucide-react";
import { db, IG, eur, norm } from "@/lib/rh";
import { homePath, specialHome, availability } from "@/lib/catalog";
import PhotoGallery from "./PhotoGallery";

type Props = { home: IG | null; position: number; total: number; saved: boolean; compared: boolean; compareFull: boolean; catalogUrl: string; onClose: () => void; onMove: (delta: number) => void; onSave: (e: React.MouseEvent, home: IG) => void; onCompare: (home: IG) => void };
export default function QuickView({ home, position, total, saved, compared, compareFull, catalogUrl, onClose, onMove, onSave, onCompare }: Props) {
  const [details, setDetails] = useState<IG | null>(null);
  useEffect(() => {
    setDetails(null);
    if (!home || specialHome(home.shortcode)) return;
    let active = true;
    db.from("ig_finds").select("id,shortcode,location_name,country_guess,price_eur,sqm,bedrooms,status,image_urls,hook").eq("shortcode", home.shortcode).neq("status", "hidden").maybeSingle().then(({ data }: { data: IG | null }) => { if (active && data) setDetails(data); });
    return () => { active = false; };
  }, [home?.shortcode]);
  const f = home ? { ...home, ...(details?.shortcode === home.shortcode ? details : {}) } : null;
  return <Dialog.Root open={!!home} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[65] bg-black/55 backdrop-blur-sm" /><Dialog.Content aria-describedby="quick-description" className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-1rem)] max-w-[960px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl max-h-[92dvh] overflow-y-auto focus:outline-none">
      {f && <>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-white px-4 py-2"><div><Dialog.Title className="text-sm font-medium">Quick view</Dialog.Title><Dialog.Description id="quick-description" className="text-xs text-ink-muted">Home {position + 1} of {total}</Dialog.Description></div><div className="flex gap-1"><button disabled={position <= 0} onClick={() => onMove(-1)} aria-label="Previous home" className="h-11 w-11 grid place-items-center rounded-full hover:bg-paper disabled:opacity-30"><ArrowLeft size={18} /></button><button disabled={position >= total - 1} onClick={() => onMove(1)} aria-label="Next home" className="h-11 w-11 grid place-items-center rounded-full hover:bg-paper disabled:opacity-30"><ArrowRight size={18} /></button><Dialog.Close aria-label="Close quick view" className="h-11 w-11 grid place-items-center rounded-full hover:bg-paper"><X size={20} /></Dialog.Close></div></header>
        <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="min-w-0 bg-paper"><PhotoGallery key={f.shortcode} images={f.image_urls || []} title={f.location_name || norm(f.country_guess)} rememberKey={f.shortcode} eager /></div>
          <div className="p-5 md:p-6 flex flex-col gap-4">
            <div><p className="text-[34px] font-semibold tracking-tight tabular-nums">{f.price_eur != null ? eur(f.price_eur) : "Price not available"}</p><h3 className="mt-1 text-lg font-medium">{f.location_name || f.country_guess || "Location not available"}</h3></div>
            <dl className="grid grid-cols-2 gap-3 text-sm">{[["Floor area", f.sqm ? `${f.sqm} m²` : "Not available"], ["Bedrooms", f.bedrooms != null ? f.bedrooms === 0 ? "Studio" : String(f.bedrooms) : "Not available"], ["Availability", availability(f)], ["Condition", "Not available"]].map(([label, value]) => <div key={label} className="rounded-xl bg-paper p-3"><dt className="text-xs text-ink-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
            {f.hook && <p className="text-sm leading-relaxed text-ink-muted">{f.hook}</p>}
            <Link to={homePath(f)} state={{ catalogUrl }} onClick={onClose} className="rh-btn-primary flex justify-center items-center gap-2 mt-auto">View full details <ExternalLink size={15} /></Link>
            <div className="grid grid-cols-2 gap-2">{!specialHome(f.shortcode) && <button onClick={e => onSave(e, f)} className="h-11 rounded-xl border border-hairline inline-flex items-center justify-center gap-2 text-sm"><Heart size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save"}</button>}<button disabled={compareFull && !compared} aria-pressed={compared} onClick={() => onCompare(f)} className="h-11 rounded-xl border border-hairline inline-flex items-center justify-center gap-2 text-sm disabled:opacity-40"><GitCompareArrows size={16} />{compared ? "Selected" : "Compare"}</button></div>
          </div>
        </div>
      </>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
