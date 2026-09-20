import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, Mail, Check, ExternalLink, Share2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";
import { scoreToGrade, formatPrice } from "@/lib/grade";
import { useToast } from "@/hooks/use-toast";
import VoteButton from "@/components/rankings/VoteButton";
import ScoreVisual from "@/components/rankings/ScoreVisual";
import { getVotedIds } from "@/lib/voteFingerprint";

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
  base_votes: number | null;
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

const isEcoBeachCity = (p: RankedProperty): boolean => {
  const hay = `${p.address || ""} ${p.city || ""} ${p.url || ""}`.toLowerCase();
  return /ecobeachcity|eco beach city/.test(hay);
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

const shareTo = async (
  url: string,
  title: string,
  toast: ReturnType<typeof useToast>["toast"],
  channel: "whatsapp" | "copy"
) => {
  if (channel === "whatsapp") {
    const wa = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  } catch {
    toast({ title: "Copy failed", description: url });
  }
};

const HeroCard = ({
  p,
  voteCount,
  voted,
  onVote,
  onOpen,
}: {
  p: RankedProperty;
  voteCount: number;
  voted: boolean;
  onVote: (id: string) => void;
  onOpen: () => void;
}) => {
  const { toast } = useToast();
  const ppsm = computePpsm(p);
  const reportUrl = `https://realhunt.co${p.slug ? `/r/${p.slug}` : `/analysis/${p.id}`}`;
  const shareTitle = `#1 worldwide on RealHunt — ${p.address || p.city} (RH score ${p.global_score}/100)`;
  const webUrl = p.url && p.url !== "manual-entry" ? (p.url.startsWith("http") ? p.url : `https://${p.url}`) : null;

  return (
    <article className="relative rounded-2xl border border-hairline-strong bg-paper overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-gold/50 to-transparent" />
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink bg-paper border border-hairline-strong px-2.5 py-1 rounded-full">
            <Crown className="h-3 w-3 text-accent-gold" /> #1 worldwide
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-5 md:gap-7 md:items-start">
          <div className="flex-shrink-0 flex md:block items-center gap-4">
            <ScoreVisual score={p.global_score} size="lg" />
          </div>

          <div className="flex-1 min-w-0">
            <button onClick={onOpen} className="text-left block group">
              <h2 className="font-display text-[22px] md:text-[28px] leading-[1.15] text-ink group-hover:text-accent-gold transition-colors">
                {p.address || `${p.city}, ${p.country}`}
              </h2>
              <p className="text-[13px] text-ink-soft mt-1">
                {p.city}{p.country ? `, ${p.country}` : ""}
                {p.property_type ? ` · ${p.property_type}` : ""}
                {p.size_sqm ? ` · ${p.size_sqm} m²` : ""}
              </p>
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">Price</div>
                <div className="font-mono text-[16px] text-ink tabular-nums">{formatPrice(p.price, p.currency)}</div>
              </div>
              {ppsm && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">€/m²</div>
                  <div className="font-mono text-[16px] text-ink tabular-nums">{ppsm.toLocaleString()}</div>
                </div>
              )}
              {p.verdict && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">Verdict</div>
                  <div className="text-[14px] text-ink font-medium">{p.verdict}</div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {webUrl && (
                <a
                  href={webUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="rh-btn-secondary !px-4 !py-2.5 !text-[13px] inline-flex items-center gap-1.5"
                >
                  Visit site <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <button
                onClick={onOpen}
                className="rh-btn-primary !px-5 !py-2.5 !text-[13px]"
              >
                See full report
              </button>

              <VoteButton
                analysisId={p.id}
                count={voteCount}
                voted={voted}
                size="lg"
                onVoted={onVote}
              />

              <div className="inline-flex items-center gap-1 ml-auto">
                <button
                  onClick={() => shareTo(reportUrl, shareTitle, toast, "whatsapp")}
                  aria-label="Share on WhatsApp"
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink px-3 py-1.5 rounded-full border border-hairline hover:border-hairline-strong"
                >
                  <Share2 className="h-3.5 w-3.5" /> WhatsApp
                </button>
                <button
                  onClick={() => shareTo(reportUrl, shareTitle, toast, "copy")}
                  className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted hover:text-ink px-3 py-1.5 rounded-full border border-hairline hover:border-hairline-strong"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const GlobalRanking = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [rankings, setRankings] = useState<RankedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [baseVotes, setBaseVotes] = useState<Record<string, number>>({});
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<"score" | "votes">("score");
  const category = params.get("cat") || "all";

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, slug, city, country, address, global_score, roi_potential, verdict, price, size_sqm, currency, property_type, url, base_votes")
        .not("global_score", "is", null)
        .order("global_score", { ascending: false })
        .limit(300);
      if (data) {
        const rows = data as RankedProperty[];
        setRankings(rows);
        const bv: Record<string, number> = {};
        for (const r of rows) bv[r.id] = r.base_votes || 0;
        setBaseVotes(bv);
      }
      setLoading(false);
    })();

    setVotedIds(getVotedIds());

    // Aggregate real vote counts (all-time)
    (async () => {
      const { data: voteRows } = await (supabase as any)
        .from("votes")
        .select("analysis_id");
      if (voteRows) {
        const counts: Record<string, number> = {};
        for (const r of voteRows as { analysis_id: string }[]) {
          counts[r.analysis_id] = (counts[r.analysis_id] || 0) + 1;
        }
        setVoteCounts(counts);
      }
    })();
  }, []);

  // Combined display vote = seeded base + real votes
  const getDisplayVotes = (id: string) => (baseVotes[id] || 0) + (voteCounts[id] || 0);

  const totalVotes = useMemo(() => {
    const ids = new Set([...Object.keys(baseVotes), ...Object.keys(voteCounts)]);
    let total = 0;
    ids.forEach((id) => { total += (baseVotes[id] || 0) + (voteCounts[id] || 0); });
    return total;
  }, [baseVotes, voteCounts]);

  const handleVoted = (id: string) => {
    setVoteCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
    setVotedIds((s) => new Set(s).add(id));
  };

  const countries = useMemo(
    () => [...new Set(rankings.map((r) => r.country).filter(Boolean))].sort() as string[],
    [rankings]
  );

  const filtered = useMemo(() => {
    let rows = [...rankings];
    if (selectedCountry !== "All") rows = rows.filter((r) => r.country === selectedCountry);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        [r.address, r.city, r.country, r.property_type].some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (category === "beachfront") {
      rows = rows.filter(isBeachfront);
    }
    if (category === "ppsm") rows = rows.filter((r) => computePpsm(r) != null);
    if (category === "price") rows = rows.filter((r) => parsePrice(r.price) != null);
    if (category === "roi") rows = rows.filter((r) => r.roi_potential != null);
    return rows;
  }, [rankings, selectedCountry, search, category]);

  const processed = useMemo(() => {
    const rows = [...filtered];
    const dv = (id: string) => (baseVotes[id] || 0) + (voteCounts[id] || 0);
    if (sortMode === "votes") {
      rows.sort((a, b) => dv(b.id) - dv(a.id) || (b.global_score || 0) - (a.global_score || 0));
      return rows;
    }
    // sortMode === score — apply category-specific score sort
    if (category === "beachfront") {
      rows.sort((a, b) => {
        const pa = computePpsm(a), pb = computePpsm(b);
        if (pa != null && pb != null && pa !== pb) return pa - pb;
        if (pa != null && pb == null) return -1;
        if (pb != null && pa == null) return 1;
        return (b.global_score || 0) - (a.global_score || 0);
      });
    } else if (category === "ppsm") rows.sort((a, b) => (computePpsm(a)! - computePpsm(b)!));
    else if (category === "price") rows.sort((a, b) => parsePrice(a.price)! - parsePrice(b.price)!);
    else if (category === "roi") rows.sort((a, b) => (b.roi_potential || 0) - (a.roi_potential || 0));
    else rows.sort((a, b) => (b.global_score || 0) - (a.global_score || 0));
    return rows;
  }, [filtered, sortMode, voteCounts, baseVotes, category]);

  const setCategory = (id: string) => {
    const p = new URLSearchParams(params);
    if (id === "all") p.delete("cat"); else p.set("cat", id);
    setParams(p, { replace: true });
  };

  const curr = (c: string | null | undefined) => (c === "GBP" ? "£" : c === "USD" ? "$" : "€");
  const hero = processed[0];
  const rest = processed.slice(1);
  const totalListings = rankings.length;

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

        {/* Quick stats + live indicator */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-good opacity-60 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
            </span>
            <span className="text-ink-muted">Live · updated in real time</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="tabular-nums"><span className="text-ink font-medium">{totalListings.toLocaleString()}</span> listings scored</span>
          <span className="hidden sm:inline">·</span>
          <span className="tabular-nums"><span className="text-accent-gold font-medium">{totalVotes.toLocaleString()}</span> votes</span>
        </div>

        <div className="mt-6 max-w-2xl"><RankingSearchBar /></div>

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

        {/* Filters + sort toggle */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, country, address…"
              className="rh-input !py-2.5 !pl-9 !text-[14px]"
            />
          </div>
          <select
            aria-label="Select country"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="rounded-full text-[13px] px-4 py-2 bg-surface text-ink border border-hairline focus:outline-none"
          >
            <option value="All">🌍 All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="inline-flex rounded-full border border-hairline bg-surface p-0.5">
            <button
              onClick={() => setSortMode("score")}
              className={`text-[12px] px-3 py-1.5 rounded-full transition-colors ${
                sortMode === "score" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              Top score
            </button>
            <button
              onClick={() => setSortMode("votes")}
              className={`text-[12px] px-3 py-1.5 rounded-full transition-colors ${
                sortMode === "votes" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
              }`}
            >
              Most voted
            </button>
          </div>

          <span className="text-[12px] text-ink-soft ml-auto tabular-nums">
            {processed.length} {processed.length === 1 ? "listing" : "listings"}
          </span>
        </div>

        {/* Hero #1 */}
        {!loading && hero && (
          <div className="mt-6">
            <HeroCard
              p={hero}
              voteCount={getDisplayVotes(hero.id)}
              voted={votedIds.has(hero.id)}
              onVote={handleVoted}
              onOpen={() => navigate(hero.slug ? `/r/${hero.slug}` : `/analysis/${hero.id}`)}
            />
          </div>
        )}

        {/* Leaderboard list */}
        <div className="mt-6 rounded-2xl border border-hairline bg-surface overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[3rem_5rem_1fr_7rem_6rem_6rem_6rem_5rem] gap-3 px-5 py-3 border-b border-hairline text-[10px] font-medium text-ink-soft uppercase tracking-[0.14em]">
            <div>#</div>
            <div className="text-center">Score</div>
            <div>Location</div>
            <div className="text-right">Price</div>
            <div className="text-right">€/m²</div>
            <div className="text-right">Verdict</div>
            <div className="text-center">Votes</div>
            <div className="text-right">Web</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-ink-soft text-sm">Loading the leaderboard…</div>
          ) : rest.length === 0 ? (
            <div className="p-10 text-center text-ink-soft text-sm">No more listings match this filter.</div>
          ) : (
            rest.slice(0, 50).map((p, i) => {
              const rank = i + 2; // hero is #1
              const ppsm = computePpsm(p);
              const webUrl = p.url && p.url !== "manual-entry" ? (p.url.startsWith("http") ? p.url : `https://${p.url}`) : null;
              const verdictClass =
                p.verdict === "Exceptional" || p.verdict === "Strong" ? "text-good bg-good/10" :
                p.verdict === "Moderate" ? "text-warn bg-warn/10" : "text-bad bg-bad/10";
              const onOpen = () => navigate(p.slug ? `/r/${p.slug}` : `/analysis/${p.id}`);
              const vc = getDisplayVotes(p.id);
              const voted = votedIds.has(p.id);

              return (
                <div key={p.id} className="border-b border-hairline last:border-0">
                  {/* MOBILE CARD */}
                  <div className="md:hidden px-4 py-4 hover:bg-[#FBF8F1] transition-colors">
                    <button onClick={onOpen} className="w-full text-left block">
                      <div className="flex items-start gap-3">
                        <ScoreVisual score={p.global_score} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[14px] text-ink font-medium truncate">
                                {p.address || `${p.city}, ${p.country}`}
                              </div>
                              <div className="text-[11px] text-ink-soft truncate">
                                <span className="font-mono">#{rank}</span>
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
                                <ExternalLink className="h-2.5 w-2.5" /> Visit site
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <VoteButton analysisId={p.id} count={vc} voted={voted} onVoted={handleVoted} />
                    </div>
                  </div>

                  {/* DESKTOP ROW */}
                  <div
                    onClick={onOpen}
                    className="hidden md:grid grid-cols-[3rem_5rem_1fr_7rem_6rem_6rem_6rem_5rem] gap-3 px-5 py-3 hover:bg-[#FBF8F1] transition-colors items-center cursor-pointer"
                  >
                    <div className="font-mono text-[12px] text-ink-soft">{rank}</div>
                    <div className="flex justify-center"><ScoreVisual score={p.global_score} size="sm" /></div>
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
                    <div className="text-right text-[13px] font-mono text-ink tabular-nums">{formatPrice(p.price, p.currency)}</div>
                    <div className="text-right text-[13px] font-mono text-ink-muted tabular-nums">
                      {ppsm ? `${curr(p.currency)}${ppsm.toLocaleString()}` : "—"}
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${verdictClass}`}>
                        {p.verdict || "—"}
                      </span>
                    </div>
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <VoteButton analysisId={p.id} count={vc} voted={voted} onVoted={handleVoted} />
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
                          <ExternalLink className="h-3 w-3" /> Visit site
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
