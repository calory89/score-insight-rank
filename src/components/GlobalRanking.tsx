import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, Mail, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";
import { scoreToGrade, gradeColor, formatPrice } from "@/lib/grade";
import { useToast } from "@/hooks/use-toast";

type RankedProperty = {
  id: string;
  slug: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  global_score: number | null;
  roi_potential: number | null;
  verdict: string | null;
  price: string | null;
  size_sqm: number | null;
  currency: string | null;
  property_type: string | null;
  url: string | null;
};

const CATEGORIES = [
  { id: "all", label: "All deals" },
  { id: "beachfront", label: "Beachfront" },
  { id: "ppsm", label: "Best €/m²" },
  { id: "roi", label: "Top ROI" },
  { id: "price", label: "Cheapest" },
];

const parsePrice = (p: string | null): number | null => {
  if (!p) return null;
  const n = parseFloat(String(p).replace(/[^0-9.]/g, ""));
  return isNaN(n) || n === 0 ? null : n;
};

const computePpsm = (p: RankedProperty): number | null => {
  const price = parsePrice(p.price);
  if (!price || !p.size_sqm || p.size_sqm <= 0) return null;
  return Math.round(price / p.size_sqm);
};

const isBeachfront = (p: RankedProperty): boolean => {
  const hay = `${p.address || ""} ${p.city || ""} ${p.property_type || ""}`.toLowerCase();
  return /\b(beach|beachfront|playa|seafront|oceanfront|coast|costa|frente al mar)\b/.test(hay) ||
    /ecobeachcity|eco beach/i.test(hay);
};

const RankingSearchBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [showLoginGate, setShowLoginGate] = useState(false);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    if (!user) { setShowLoginGate(true); return; }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="space-y-2">
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-surface rounded-xl border border-hairline p-2">
        <div className="flex items-center flex-1 min-w-0">
          <Search className="ml-3 h-4 w-4 text-ink-soft flex-shrink-0" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Paste any property URL to score it…"
            className="flex-1 bg-transparent px-3 py-3 text-sm text-ink placeholder:text-ink-soft focus:outline-none min-w-0"
          />
        </div>
        <button className="rh-btn-primary !px-4 !py-2.5 !text-[13px]" onClick={handleAnalyze}>
          Score this listing <ArrowRight className="ml-1 h-3 w-3" />
        </button>
      </div>
      {showLoginGate && <LoginGateModal open={showLoginGate} onClose={() => setShowLoginGate(false)} />}
    </div>
  );
};

const WeeklyEmailCapture = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid email" });
      return;
    }
    try {
      await (supabase as any).from("newsletter_subscribers").insert({ email, source: "rankings" });
    } catch {}
    setDone(true);
    toast({ title: "You're in.", description: "Top 10 deals every Friday." });
  };

  return (
    <div className="rounded-2xl border border-hairline bg-[#FBF8F1] p-5 md:p-6 mt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
        <div>
          <p className="font-display text-[18px] text-ink">Get the Top 10 deals every Friday.</p>
          <p className="text-[12px] text-ink-soft mt-1">One email. Highest-scoring listings only. No promos.</p>
        </div>
        {done ? (
          <div className="flex items-center gap-2 text-good text-sm"><Check className="h-4 w-4" /> Subscribed</div>
        ) : (
          <form onSubmit={submit} className="flex w-full md:w-auto gap-2">
            <div className="relative flex-1 md:w-72">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="rh-input !py-3 !pl-9 !text-[14px]"
              />
            </div>
            <button type="submit" className="rh-btn-primary !px-5 !py-3 !text-[14px]">Subscribe</button>
          </form>
        )}
      </div>
    </div>
  );
};

const GlobalRanking = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rankings, setRankings] = useState<RankedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const category = params.get("cat") || "all";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, slug, city, country, address, global_score, roi_potential, verdict, price, size_sqm, currency, property_type, url")
        .not("global_score", "is", null)
        .order("global_score", { ascending: false })
        .limit(300);
      if (data) setRankings(data as RankedProperty[]);
      setLoading(false);
    })();
  }, []);

  const countries = useMemo(
    () => [...new Set(rankings.map((r) => r.country).filter(Boolean))].sort() as string[],
    [rankings]
  );

  const processed = useMemo(() => {
    let rows = [...rankings];
    if (selectedCountry !== "All") rows = rows.filter((r) => r.country === selectedCountry);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        [r.address, r.city, r.country, r.property_type].some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (category === "beachfront") {
      // Strict: real beachfront only, sorted by €/m² asc (best value first), tiebreak by score desc
      rows = rows.filter(isBeachfront).sort((a, b) => {
        const pa = computePpsm(a);
        const pb = computePpsm(b);
        if (pa != null && pb != null && pa !== pb) return pa - pb;
        if (pa != null && pb == null) return -1;
        if (pb != null && pa == null) return 1;
        return (b.global_score || 0) - (a.global_score || 0);
      });
    }
    if (category === "ppsm") rows = rows.filter((r) => computePpsm(r) != null).sort((a, b) => (computePpsm(a)! - computePpsm(b)!));
    if (category === "price") rows = rows.filter((r) => parsePrice(r.price) != null).sort((a, b) => parsePrice(a.price)! - parsePrice(b.price)!);
    if (category === "roi") rows = rows.filter((r) => r.roi_potential != null).sort((a, b) => (b.roi_potential || 0) - (a.roi_potential || 0));

    return rows;
  }, [rankings, selectedCountry, search, category]);

  const setCategory = (id: string) => {
    const p = new URLSearchParams(params);
    if (id === "all") p.delete("cat"); else p.set("cat", id);
    setParams(p, { replace: true });
  };

  const curr = (c: string | null | undefined) => (c === "GBP" ? "£" : c === "USD" ? "$" : "€");

  return (
    <section id="rankings" className="py-10 md:py-16">
      <div className="max-w-[1140px] mx-auto px-6">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Leaderboard</div>
        <h1 className="font-display text-[36px] md:text-[52px] text-ink leading-[1.05] mt-2">
          Top real-estate deals worldwide<span className="text-accent-gold">.</span>
        </h1>
        <p className="reading text-ink-muted mt-3 max-w-[640px]">
          Ranked by the RealHunt forensic score. No sponsors. No paid placement. Every number traceable in{" "}
          <a href="/method" className="rh-btn-tertiary">/method</a>.
        </p>

        <div className="mt-8 max-w-2xl"><RankingSearchBar /></div>

        {/* Category tabs */}
        <div className="mt-8 flex items-center gap-2 flex-wrap">
          {CATEGORIES.map((c) => {
            const active = (category === "all" && c.id === "all") || category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-[13px] px-4 py-2 rounded-full border transition-colors ${
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-surface text-ink-muted border-hairline hover:border-hairline-strong"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, country, address…"
              className="rh-input !py-2.5 !pl-9 !text-[14px]"
            />
          </div>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-full text-[13px] px-4 py-2 bg-surface text-ink border border-hairline focus:outline-none"
          >
            <option value="All">🌍 All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-[12px] text-ink-soft ml-auto tabular-nums">
            {processed.length} {processed.length === 1 ? "listing" : "listings"}
          </span>
        </div>

        {/* Leaderboard */}
        <div className="mt-6 rounded-2xl border border-hairline bg-surface overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[3rem_1fr_5rem_4rem_7rem_6rem_6rem_5rem] gap-3 px-5 py-3 border-b border-hairline text-[10px] font-medium text-ink-soft uppercase tracking-[0.14em]">
            <div>#</div>
            <div>Location</div>
            <div className="text-center">Score</div>
            <div className="text-center">Grade</div>
            <div className="text-right">Price</div>
            <div className="text-right">€/m²</div>
            <div className="text-right">Verdict</div>
            <div className="text-right">Web</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-ink-soft text-sm">Loading the leaderboard…</div>
          ) : processed.length === 0 ? (
            <div className="p-10 text-center text-ink-soft text-sm">No listings match this filter yet.</div>
          ) : (
            processed.slice(0, 50).map((p, i) => {
              const ppsm = computePpsm(p);
              const grade = scoreToGrade(p.global_score);
              const webUrl = p.url && p.url !== "manual-entry" ? (p.url.startsWith("http") ? p.url : `https://${p.url}`) : null;
              const verdictClass =
                p.verdict === "Exceptional" || p.verdict === "Strong" ? "text-good bg-good/10" :
                p.verdict === "Moderate" ? "text-warn bg-warn/10" : "text-bad bg-bad/10";
              const onOpen = () => navigate(p.slug ? `/r/${p.slug}` : `/analysis/${p.id}`);

              return (
                <div key={p.id} className="border-b border-hairline last:border-0">
                  {/* MOBILE CARD */}
                  <button
                    onClick={onOpen}
                    className="md:hidden w-full text-left px-4 py-4 hover:bg-[#FBF8F1] transition-colors block"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-xl border border-hairline bg-paper flex flex-col items-center justify-center ${gradeColor(p.global_score)}`}>
                        <span className="font-mono text-[14px] font-semibold leading-none">{p.global_score}</span>
                        <span className="font-display text-[10px] mt-0.5 leading-none">{grade}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[14px] text-ink font-medium truncate">
                              {p.address || `${p.city}, ${p.country}`}
                            </div>
                            <div className="text-[11px] text-ink-soft truncate">
                              <span className="font-mono">#{i + 1}</span>
                              {p.city ? ` · ${p.city}` : ""}{p.country ? `, ${p.country}` : ""}
                              {p.property_type ? ` · ${p.property_type}` : ""}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[15px] font-mono font-semibold text-ink tabular-nums leading-tight">
                              {formatPrice(p.price, p.currency)}
                            </div>
                            {ppsm && (
                              <div className="text-[10px] font-mono text-ink-soft tabular-nums">
                                {curr(p.currency)}{ppsm.toLocaleString()}/m²
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${verdictClass}`}>
                            {p.verdict || "—"}
                          </span>
                          {webUrl && (
                            <a
                              href={webUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink px-2 py-0.5 rounded-full border border-hairline"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Listing
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* DESKTOP ROW */}
                  <div
                    onClick={onOpen}
                    className="hidden md:grid grid-cols-[3rem_1fr_5rem_4rem_7rem_6rem_6rem_5rem] gap-3 px-5 py-3 hover:bg-[#FBF8F1] transition-colors items-center cursor-pointer"
                  >
                    <div className="font-mono text-[12px] text-ink-soft">{i + 1}</div>
                    <div className="min-w-0">
                      <div className="text-[14px] text-ink truncate font-medium">
                        {p.address || `${p.city}, ${p.country}`}
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        {p.city}{p.country ? `, ${p.country}` : ""}
                        {p.property_type ? ` · ${p.property_type}` : ""}
                        {p.size_sqm ? ` · ${p.size_sqm} m²` : ""}
                      </div>
                    </div>
                    <div className="text-center text-[13px] font-mono text-ink tabular-nums">
                      <span className="font-semibold">{p.global_score}</span>
                    </div>
                    <div className={`text-center font-display text-[16px] ${gradeColor(p.global_score)}`}>{grade}</div>
                    <div className="text-right text-[13px] font-mono text-ink tabular-nums">{p.price || "—"}</div>
                    <div className="text-right text-[13px] font-mono text-ink-muted tabular-nums">
                      {ppsm ? `${curr(p.currency)}${ppsm.toLocaleString()}` : "—"}
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${verdictClass}`}>
                        {p.verdict || "—"}
                      </span>
                    </div>
                    <div className="text-right" onClick={(e) => e.stopPropagation()}>
                      {webUrl ? (
                        <a
                          href={webUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-[11px] text-ink-muted hover:text-ink px-2 py-1 rounded-md border border-hairline hover:border-hairline-strong transition-colors"
                          title="Open the original listing"
                        >
                          <ExternalLink className="h-3 w-3" /> Web
                        </a>
                      ) : (
                        <span className="text-[11px] text-ink-soft">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>


        <WeeklyEmailCapture />
      </div>
    </section>
  );
};

export default GlobalRanking;
