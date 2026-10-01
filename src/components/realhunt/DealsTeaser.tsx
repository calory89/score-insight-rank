import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { featuredDeals, flagOf, formatEUR } from "@/data/deals";

const DealsTeaser = () => {
  const deals = featuredDeals(3);
  if (deals.length === 0) return null;

  return (
    <section className="max-w-[1140px] mx-auto px-6 py-16 md:py-24">
      <div className="mb-10 max-w-[680px]">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Deals</div>
        <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
          The best listings on earth, this week.
        </h2>
        <p className="mt-4 text-ink-muted text-[16px] leading-relaxed">
          We read the portals so you don't. Every deal below was open and priced when we checked it,
          with the numbers that make it interesting — and the catch that might kill it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {deals.map((d) => (
          <Link
            key={d.id}
            to="/deals"
            className="rh-card flex flex-col h-full !p-0 overflow-hidden hover:border-hairline-strong transition-colors"
          >
            <div className="bg-[#ECEDEE]">
              <img
                src={d.image}
                alt={`${d.title} — ${d.city}, ${d.country}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-[180px] object-cover"
              />
            </div>
            <div className="p-6 flex flex-col flex-1">
              <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">
                {flagOf(d.countryCode)} {d.city}
              </div>
              <div className="font-display text-[30px] text-ink tabular mt-3 leading-none">
                {formatEUR(d.price)}
              </div>
              <h3 className="font-display text-[18px] text-ink leading-snug mt-3">{d.title}</h3>
              <p className="mt-3 text-ink-muted text-[14px] leading-relaxed flex-1">{d.angle}</p>
              <div className="mt-5 pt-4 hairline-t text-[13px] text-ink flex items-center gap-1.5">
                See the full deal <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Link to="/deals" className="rh-btn-primary">
          Open the deals board
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
};

export default DealsTeaser;
