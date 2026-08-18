import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import DealCard from "@/components/realhunt/DealCard";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { publishedDeals, flagOf, formatEUR } from "@/data/deals";
import type { DealType } from "@/data/deals";

const PRICE_BANDS = [
  { key: "all", label: "Any price", max: Infinity },
  { key: "30", label: "Under €30k", max: 30000 },
  { key: "75", label: "Under €75k", max: 75000 },
  { key: "150", label: "Under €150k", max: 150000 },
];

const SORTS = [
  { key: "price", label: "Cheapest first" },
  { key: "sqm", label: "Best €/m²" },
  { key: "yield", label: "Highest yield" },
];

const TYPES: { key: DealType | "all"; label: string }[] = [
  { key: "all", label: "All types" },
  { key: "house", label: "Houses" },
  { key: "apartment", label: "Apartments" },
  { key: "villa", label: "Villas" },
  { key: "land", label: "Land" },
  { key: "building", label: "Buildings" },
];

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`text-[13px] rounded-full px-3.5 py-2 border transition-colors ${
      active
        ? "bg-[#16150F] text-white border-[#16150F]"
        : "bg-surface text-ink-muted border-hairline hover:border-hairline-strong"
    }`}
  >
    {children}
  </button>
);

const Deals = () => {
  useDocumentMeta({
    title: "Deals — The best property listings on earth, scored",
    description:
      "A hand-checked board of the best real estate deals worldwide: €12k Sicilian townhouses, Kyoto akiya, 18% yield Cleveland rentals. Every listing verified, every catch disclosed.",
    canonicalUrl: "https://realhunt.co/deals",
  });

  const all = useMemo(() => publishedDeals(), []);
  const [country, setCountry] = useState<string>("all");
  const [band, setBand] = useState<string>("all");
  const [type, setType] = useState<DealType | "all">("all");
  const [sort, setSort] = useState<string>("price");

  const countries = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number }>();
    all.forEach((d) => {
      const cur = map.get(d.country);
      if (cur) cur.count += 1;
      else map.set(d.country, { name: d.country, code: d.countryCode, count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [all]);

  const filtered = useMemo(() => {
    const max = PRICE_BANDS.find((b) => b.key === band)?.max ?? Infinity;
    const list = all.filter(
      (d) =>
        (country === "all" || d.country === country) &&
        (type === "all" || d.type === type) &&
        d.price <= max
    );
    return [...list].sort((a, b) => {
      if (sort === "sqm") {
        return (a.pricePerSqm ?? Number.MAX_SAFE_INTEGER) - (b.pricePerSqm ?? Number.MAX_SAFE_INTEGER);
      }
      if (sort === "yield") return (b.grossYieldPct ?? -1) - (a.grossYieldPct ?? -1);
      return a.price - b.price;
    });
  }, [all, country, band, type, sort]);

  const cheapest = useMemo(() => Math.min(...all.map((d) => d.price)), [all]);
  const countryCount = countries.length;

  return (
    <div className="min-h-screen bg-paper">
      <RHNav />

      {/* HEADER */}
      <section className="max-w-[1140px] mx-auto px-5 sm:px-6 pt-10 sm:pt-16 pb-8">
        <div className="max-w-[760px]">
          <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Deals</div>
          <h1 className="font-display text-[38px] md:text-[58px] text-ink mt-3 leading-[1.03] tracking-[-0.02em]">
            The best listings on earth, with the catch included.
          </h1>
          <p className="mt-5 text-ink-muted text-[17px] leading-relaxed">
            We read the portals so you don't. Every deal here was open and priced on the day we checked it.
            No affiliate links, no paid placements, no agency feeding us inventory — if a listing dies, it
            comes off the board.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-10 max-w-[560px]">
          <div>
            <div className="font-display text-[30px] text-ink tabular leading-none">{all.length}</div>
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft mt-2">Live deals</div>
          </div>
          <div>
            <div className="font-display text-[30px] text-ink tabular leading-none">{countryCount}</div>
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft mt-2">Countries</div>
          </div>
          <div>
            <div className="font-display text-[30px] text-ink tabular leading-none">
              {formatEUR(cheapest)}
            </div>
            <div className="text-[12px] uppercase tracking-[0.14em] text-ink-soft mt-2">Cheapest</div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <div className="sticky top-16 z-30 bg-paper/90 backdrop-blur-md border-y border-hairline">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Chip active={country === "all"} onClick={() => setCountry("all")}>
              All countries
            </Chip>
            {countries.map((c) => (
              <Chip key={c.name} active={country === c.name} onClick={() => setCountry(c.name)}>
                {flagOf(c.code)} {c.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {PRICE_BANDS.map((b) => (
              <Chip key={b.key} active={band === b.key} onClick={() => setBand(b.key)}>
                {b.label}
              </Chip>
            ))}
            <span className="w-px h-6 bg-[var(--rh-hairline)] mx-1 hidden sm:block" />
            {TYPES.map((t) => (
              <Chip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>
                {t.label}
              </Chip>
            ))}
            <span className="w-px h-6 bg-[var(--rh-hairline)] mx-1 hidden sm:block" />
            {SORTS.map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* GRID */}
      <section className="max-w-[1140px] mx-auto px-5 sm:px-6 py-12">
        <div className="text-[13px] text-ink-soft mb-6 tabular">
          {filtered.length} {filtered.length === 1 ? "deal" : "deals"}
        </div>

        {filtered.length === 0 ? (
          <div className="rh-card text-center py-16">
            <h3 className="font-display text-[22px] text-ink">Nothing at that price. Yet.</h3>
            <p className="mt-3 text-ink-muted text-[15px]">
              Widen the filters, or paste a listing you found yourself and let RealHunt score it.
            </p>
            <Link to="/" className="rh-btn-primary mt-6">
              Score a listing
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((d) => (
              <DealCard key={d.id} deal={d} />
            ))}
          </div>
        )}
      </section>

      {/* DISCLAIMER + CTA */}
      <div className="bg-surface-2 border-y border-hairline">
        <section className="max-w-[1140px] mx-auto px-5 sm:px-6 py-16">
          <div className="max-w-[680px]">
            <h2 className="font-display text-[28px] md:text-[36px] text-ink leading-tight">
              Found something better? Score it in ten seconds.
            </h2>
            <p className="mt-4 text-ink-muted text-[15px] leading-relaxed">
              This board is editorial, not advice. Prices, yields and price-per-sqm are what the portal
              showed on the date noted on each card — verify everything before you wire money, and assume
              renovation quotes are optimistic. RealHunt earns nothing if you buy.
            </p>
            <Link to="/" className="rh-btn-primary mt-7">
              Paste any listing
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>

      <RHFooter />
    </div>
  );
};

export default Deals;
