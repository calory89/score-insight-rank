import OriginalListingLink from "@/components/realhunt/OriginalListingLink";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { flagOf, formatEUR } from "@/data/deals";
import type { Deal } from "@/data/deals";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</div>
    <div className="text-[15px] text-ink tabular mt-0.5">{value}</div>
  </div>
);

const DealCard = ({ deal }: { deal: Deal }) => {
  const analyzeHref = `/app/analyze?u=${encodeURIComponent(deal.url)}`;

  return (
    <article className="rh-card flex flex-col h-full !p-0 overflow-hidden">
      <OriginalListingLink
        href={deal.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="block bg-[#ECEDEE]"
      >
        <img
          src={deal.image}
          alt={`${deal.title} · ${deal.city}, ${deal.country}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full h-[200px] object-cover"
        />
      </OriginalListingLink>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">
              {flagOf(deal.countryCode)} {deal.city} · {deal.country}
            </div>
            <h3 className="font-display text-[21px] text-ink leading-tight mt-2">{deal.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-[24px] text-ink tabular leading-none">
              {formatEUR(deal.price)}
            </div>
            {deal.localPrice && (
              <div className="text-[12px] text-ink-soft tabular mt-1">{deal.localPrice}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 hairline-t">
          <Stat label="Size" value={deal.sqm ? `${deal.sqm} m²` : "—"} />
          <Stat
            label="€/m²"
            value={deal.pricePerSqm ? deal.pricePerSqm.toLocaleString("en-GB") : "—"}
          />
          <Stat label="Gross yield" value={deal.grossYieldPct ? `${deal.grossYieldPct}%` : "n/a"} />
        </div>

        <p className="mt-5 text-ink-muted text-[14px] leading-relaxed flex-1">{deal.angle}</p>

        <div className="mt-4 rounded-xl bg-[#ECEDEE] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">The catch</div>
          <p className="text-[13px] text-ink-muted leading-relaxed mt-1">{deal.risk}</p>
        </div>

        {deal.tags && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {deal.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] uppercase tracking-[0.12em] text-ink-soft border border-hairline rounded-full px-2.5 py-1"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 pt-5 hairline-t flex items-center justify-between gap-3">
          <OriginalListingLink
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rh-btn-tertiary text-[13px] inline-flex items-center gap-1.5"
          >
            {deal.source} <ExternalLink size={13} />
          </OriginalListingLink>
          <Link to={analyzeHref} className="rh-btn-secondary !py-2.5 !px-4 !text-[13px]">
            Score it <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="mt-3 text-[11px] text-ink-soft">Listing checked {deal.verifiedOn}</div>
      </div>
    </article>
  );
};

export default DealCard;
