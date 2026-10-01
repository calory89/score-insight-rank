import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import { ArrowRight, MapPin } from "lucide-react";
import { formatPrice } from "@/lib/grade";

interface Row {
  slug: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  global_score: number | null;
  verdict: string | null;
  price: string | null;
  currency: string | null;
  property_type: string | null;
}

const cap = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

const MarketCity = () => {
  const { city = "" } = useParams<{ city: string }>();
  const pretty = cap(decodeURIComponent(city));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const title = `Best-value real estate in ${pretty}, ranked by RealHunt`;
  const description = `The highest-scored properties in ${pretty} — forensic RealHunt analysis. Every number sourced.`;

  useDocumentMeta({
    title: `${title} — RealHunt`,
    description,
    canonicalUrl: `https://realhunt.co/market/${encodeURIComponent(city.toLowerCase())}`,
    ogImage: "https://realhunt.co/og-default-100k.jpg",
  });

  useEffect(() => {
    if (!city) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("analyses")
        .select("slug, address, city, country, global_score, verdict, price, currency, property_type")
        .ilike("city", pretty)
        .not("global_score", "is", null)
        .not("slug", "is", null)
        .order("global_score", { ascending: false })
        .limit(50);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, [city, pretty]);

  useEffect(() => {
    if (!rows.length) return;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      numberOfItems: rows.length,
      itemListElement: rows.slice(0, 20).map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://realhunt.co/r/${r.slug}`,
        name: r.address || r.city || "Property",
      })),
    };
    let s = document.querySelector('script[data-jsonld="hub"]') as HTMLScriptElement | null;
    if (!s) { s = document.createElement("script"); s.type = "application/ld+json"; s.setAttribute("data-jsonld", "hub"); document.head.appendChild(s); }
    s.textContent = JSON.stringify(jsonLd);
    return () => { s?.remove(); };
  }, [rows, title]);

  return (
    <div className="min-h-screen bg-background">
      <RHNav />
      <div className="max-w-[1140px] mx-auto px-6 pt-28 pb-20">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft flex items-center gap-2">
          <MapPin size={12} /> {pretty}
        </div>
        <h1 className="font-display text-[36px] md:text-[48px] text-ink mt-3 leading-tight tracking-[-0.02em]">
          Best-value real estate in {pretty}
        </h1>
        <p className="mt-4 text-ink-muted text-[16px] max-w-[680px]">
          {rows.length || "—"} properties ranked by the RealHunt forensic score.
        </p>

        <div className="mt-10 space-y-3">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl border border-hairline bg-paper animate-pulse" />
          ))}
          {!loading && rows.length === 0 && (
            <div className="rh-card text-center text-ink-muted">No scored properties in {pretty} yet. Be the first — paste a listing.</div>
          )}
          {rows.map((r, i) => (
            <Link key={r.slug} to={`/r/${r.slug}`} className="block rh-card !p-4 md:!p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="font-display tabular text-[28px] w-12 text-ink-soft text-right">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-[17px] text-ink truncate">{r.address || r.city || "Property"}</div>
                  <div className="text-[12px] text-ink-soft mt-0.5 truncate">
                    {[r.city, r.country].filter(Boolean).join(" · ")}{r.property_type ? ` · ${r.property_type}` : ""}
                    {r.price ? ` · ${formatPrice(r.price, r.currency || "EUR")}` : ""}
                  </div>
                </div>
                <div className="font-display tabular text-[28px]" style={{ color: (r.global_score || 0) >= 80 ? "#1E6B4F" : (r.global_score || 0) >= 60 ? "#D4420C" : "#B7791F" }}>
                  {r.global_score}
                </div>
                <ArrowRight size={16} className="text-ink-soft" />
              </div>
            </Link>
          ))}
        </div>
      </div>
      <RHFooter />
    </div>
  );
};

export default MarketCity;
