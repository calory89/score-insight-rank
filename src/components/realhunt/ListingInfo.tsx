import { BedDouble, Maximize2, Waves } from "lucide-react";
import { eur, FLAG, IG, norm } from "@/lib/rh";

export default function ListingInfo({ home }: { home: IG }) {
  const country = norm(home.country_guess);
  return (
    <div className="p-3 sm:p-4 text-ink bg-white min-h-[140px] sm:min-h-[190px]">
      <p className="text-[21px] sm:text-[26px] font-semibold tracking-tight leading-tight tabular-nums">{home.price_eur != null ? eur(home.price_eur) : "Price in listing"}</p>
      <p className="mt-1.5 text-[12px] sm:text-[14px] font-medium leading-snug line-clamp-2 min-h-[34px] sm:min-h-[38px] break-words">{FLAG[country]} {home.location_name || country}</p>
      <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1.5 text-[11px] sm:text-[12px] text-ink-muted">
        {!!home.sqm && <span className="inline-flex items-center gap-1.5"><Maximize2 size={13} />{home.sqm} m²</span>}
        {!!home.bedrooms && <span className="inline-flex items-center gap-1.5"><BedDouble size={14} />{home.bedrooms} {home.bedrooms === 1 ? "bedroom" : "bedrooms"}</span>}
        {home.is_beach && <span className="inline-flex items-center gap-1.5"><Waves size={14} />Beach</span>}
      </div>
      {home.hook && <p className="max-sm:hidden mt-2.5 text-[13px] text-ink-muted leading-relaxed line-clamp-2">{home.hook}</p>}
    </div>
  );
}
