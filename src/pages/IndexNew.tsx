import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ShieldCheck, Eye, Scale, Ban } from "lucide-react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import ScoreBadge from "@/components/realhunt/ScoreBadge";
import CountryPreviewTable, { PreviewRow } from "@/components/realhunt/CountryPreviewTable";

interface ProjectRow {
  slug: string;
  name: string;
  city: string | null;
  is_owned_by_realhunt: boolean | null;
  developer: { name: string } | null;
  country: { name: string; slug: string; flag_emoji: string | null };
  score: { weighted_score: number | null; rank_global: number | null } | null;
}

const FEATURED_COUNTRIES = ["uae", "spain", "indonesia", "mexico"];

const IndexNew = () => {
  useDocumentMeta({
    title: "RealHunt — The Global Off-Plan Real Estate Index",
    description:
      "Every off-plan and pre-construction project on Earth, scored 1 to 10 on the same five public dimensions. Independent. Transparent. Free for verified agents.",
  });

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select(
          "slug,name,city,is_owned_by_realhunt,developer:developers(name),country:countries(name,slug,flag_emoji),score:project_scores(weighted_score,rank_global)"
        )
        .eq("active", true);

      const rows = (data || []).map((p: any) => ({
        ...p,
        score: Array.isArray(p.score) ? p.score[0] : p.score,
      })) as ProjectRow[];
      rows.sort((a, b) => (b.score?.weighted_score || 0) - (a.score?.weighted_score || 0));
      setProjects(rows);
      setLoading(false);
    })();
  }, []);

  const top10 = projects.slice(0, 10);

  const byCountry = (slug: string): PreviewRow[] =>
    projects
      .filter((p) => p.country.slug === slug)
      .slice(0, 5)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        slug: p.slug,
        developer: p.developer?.name || "—",
        city: p.city || "",
        score: Number(p.score?.weighted_score || 0),
        is_owned_by_realhunt: !!p.is_owned_by_realhunt,
      }));

  return (
    <div className="min-h-screen bg-rh-navy text-white antialiased">
      <RHNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-rh-gold/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-6">
            The Global Off-Plan Index
          </p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-4xl">
            Every off-plan project on Earth.{" "}
            <span className="italic text-rh-gold">Ranked.</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
            Independent scoring on five public dimensions. Live commission terms. Real delivery
            data. Built for the next decade of off-plan real estate.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-rh-gold text-rh-navy font-semibold hover:bg-rh-gold-soft transition"
            >
              Browse the index <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/apply"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 text-white hover:bg-white/5 transition"
            >
              Apply as agent — free forever
            </Link>
          </div>

          {/* Top 10 ranking preview */}
          <div className="mt-16 rounded-xl border border-rh-line bg-rh-navy-2/60 backdrop-blur overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rh-line">
              <div>
                <h3 className="font-serif text-xl text-white">Global Top 10 — live</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Ranked by RealHunt 5-dimension weighted score · updated continuously
                </p>
              </div>
              <Link to="/browse" className="text-xs text-rh-gold hover:text-rh-gold-soft">
                Full ranking →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-[10px] tracking-widest uppercase text-white/40">
                <tr>
                  <th className="text-left font-medium px-5 py-2 w-12">Rank</th>
                  <th className="text-left font-medium px-2 py-2">Project</th>
                  <th className="text-left font-medium px-2 py-2 hidden md:table-cell">Developer</th>
                  <th className="text-left font-medium px-2 py-2 hidden md:table-cell">Country</th>
                  <th className="text-right font-medium px-5 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-t border-rh-line/60">
                        <td colSpan={5} className="px-5 py-4">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : top10.map((p, i) => (
                      <tr key={p.slug} className="border-t border-rh-line/60 hover:bg-white/[0.02] transition">
                        <td className="px-5 py-3.5 font-mono text-white/40 tabular-nums text-xs">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-2 py-3.5">
                          <Link to={`/projects/${p.slug}`} className="text-white hover:text-rh-gold font-medium">
                            {p.name}
                          </Link>
                          <div className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
                            <span className="md:hidden">{p.country.flag_emoji}</span>
                            {p.city}
                            {p.is_owned_by_realhunt && (
                              <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-rh-gold/15 text-rh-gold ring-1 ring-rh-gold/30">
                                Owned by RealHunt
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-3.5 text-white/60 hidden md:table-cell">
                          {p.developer?.name}
                        </td>
                        <td className="px-2 py-3.5 text-white/60 hidden md:table-cell">
                          <span className="mr-1.5">{p.country.flag_emoji}</span>
                          {p.country.name}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <ScoreBadge score={Number(p.score?.weighted_score || 0)} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pain section */}
      <section className="border-t border-rh-line bg-rh-navy-2/40">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">
            The problem
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-white max-w-3xl leading-tight">
            Off-plan real estate is the largest opaque market on Earth.
          </h2>
          <div className="grid md:grid-cols-2 gap-12 mt-12 text-white/70 text-lg leading-relaxed">
            <p>
              Buyers compare glossy renders, never delivery records. Agents juggle 40 spreadsheets
              of commission terms that change every quarter. Developers launch in silence.
            </p>
            <p>
              Trillions of dollars move every year on broker hearsay. There is no Bloomberg for
              off-plan. No Morningstar. No public ranking. <span className="text-white">Until now.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-t border-rh-line">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">
            What RealHunt is
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-white max-w-3xl leading-tight">
            Four principles. No exceptions.
          </h2>
          <div className="grid md:grid-cols-2 gap-px mt-14 bg-rh-line rounded-xl overflow-hidden border border-rh-line">
            {[
              {
                icon: Eye,
                title: "Public methodology",
                body: "Five dimensions. Documented weights. Every score is reproducible by anyone.",
              },
              {
                icon: Scale,
                title: "Independent ranking",
                body: "Developers cannot pay for placement. Owned-by-RealHunt projects are flagged in every view.",
              },
              {
                icon: ShieldCheck,
                title: "Real commission data",
                body: "Live percentages, milestones, payout terms. Sourced from signed broker agreements.",
              },
              {
                icon: Ban,
                title: "No paywalls for agents",
                body: "Verified off-plan agents access everything for free. Always. We monetize developers, never brokers.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-rh-navy p-8">
                <Icon className="h-6 w-6 text-rh-gold mb-5" />
                <h3 className="font-serif text-2xl text-white mb-3">{title}</h3>
                <p className="text-white/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology preview */}
      <section className="border-t border-rh-line bg-rh-navy-2/40">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">
            The methodology
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-white max-w-3xl leading-tight">
            Five dimensions. One score. Public weights.
          </h2>
          <div className="grid md:grid-cols-5 gap-6 mt-14">
            {[
              { d: "Developer reputation", w: "20%", desc: "Track record, delivered units, default history." },
              { d: "Delivery certainty", w: "25%", desc: "Construction progress, escrow, regulator status." },
              { d: "Legal protection", w: "15%", desc: "Title, jurisdiction, escrow law, buyer recourse." },
              { d: "Location fundamentals", w: "20%", desc: "Demand, infrastructure, supply pipeline." },
              { d: "Investment economics", w: "20%", desc: "Yield, exit liquidity, payment plan, ticket fit." },
            ].map((d, i) => (
              <div key={d.d} className="rounded-lg border border-rh-line bg-rh-navy p-5">
                <div className="text-[10px] tracking-widest uppercase text-white/40">Dim. {i + 1}</div>
                <div className="font-mono text-2xl text-rh-gold mt-2">{d.w}</div>
                <h4 className="font-serif text-lg text-white mt-3">{d.d}</h4>
                <p className="text-sm text-white/50 mt-2 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/methodology" className="inline-flex items-center gap-2 mt-10 text-rh-gold hover:text-rh-gold-soft text-sm">
            Read the full methodology <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* EcoBeachCity disclosure */}
      <section className="border-t border-rh-line">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="rounded-xl border border-rh-gold/30 bg-rh-gold/[0.04] p-8 md:p-10">
            <div className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-3">
              Conflict-of-interest disclosure
            </div>
            <h3 className="font-serif text-2xl md:text-3xl text-white leading-snug max-w-3xl">
              EcoBeachCity is owned by RealHunt's founders.
            </h3>
            <p className="text-white/70 mt-4 max-w-3xl leading-relaxed">
              It appears in our index like any other project, scored by the same independent
              methodology. We flag this on every page where it appears so you can decide whether to
              include it in your shortlist. Full disclosure on the project page.
            </p>
          </div>
        </div>
      </section>

      {/* Country preview tables */}
      <section className="border-t border-rh-line bg-rh-navy-2/40">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">
            By country
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-white max-w-3xl leading-tight">
            Live rankings, top markets.
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {FEATURED_COUNTRIES.map((slug) => {
              const sample = projects.find((p) => p.country.slug === slug);
              if (!sample) return null;
              return (
                <CountryPreviewTable
                  key={slug}
                  countrySlug={slug}
                  countryName={sample.country.name}
                  flag={sample.country.flag_emoji || ""}
                  rows={byCountry(slug)}
                />
              );
            })}
          </div>
          <Link to="/countries" className="inline-flex items-center gap-2 mt-10 text-rh-gold hover:text-rh-gold-soft text-sm">
            All countries <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Free for agents */}
      <section className="border-t border-rh-line">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">
              For agents
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight">
              Free forever. Independent. No platform fees, no client lock-in.
            </h2>
            <p className="text-white/70 mt-6 text-lg leading-relaxed">
              We monetize developers who want exposure on the index. Agents never pay. Your client
              list stays yours. Approval rate ~60%. 24-hour turnaround.
            </p>
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 mt-8 px-6 py-3.5 rounded-md bg-rh-gold text-rh-navy font-semibold hover:bg-rh-gold-soft transition"
            >
              Apply now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-4">
            {[
              "Unlimited dossier downloads",
              "Live commission terms across 100+ projects",
              "Reserve allocation slots before public launch",
              "Saved searches with email alerts",
              "Pipeline manager built for off-plan timelines",
              "Direct line to project owners — no middlemen",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-white/80">
                <Check className="h-5 w-5 text-rh-gold flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-rh-line bg-rh-navy-2/40">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-gold font-semibold mb-4">FAQ</p>
          <h2 className="font-serif text-4xl md:text-5xl text-white leading-tight">
            What people ask first.
          </h2>
          <div className="mt-12 divide-y divide-rh-line border-y border-rh-line">
            {[
              { q: "Who builds the scores?", a: "RealHunt's independent research team using a public methodology. Developers cannot influence rankings." },
              { q: "How do you make money if agents are free?", a: "Developers pay for verified profile placement, dossier hosting, and qualified agent introductions. Agents pay nothing." },
              { q: "Is the methodology really public?", a: "Yes. Every weight, every input, every formula is documented at /methodology. Anyone can audit a score." },
              { q: "Do you cover resale or rentals?", a: "No. Out of scope, on purpose. RealHunt is off-plan and pre-construction only." },
              { q: "What countries are live?", a: "UAE, Spain, Indonesia, Mexico, Portugal, Greece, Thailand, Costa Rica, Dominican Republic. Coming next: Vietnam, Brazil, Georgia, Egypt, Saudi Arabia, Oman." },
              { q: "How do you verify agents?", a: "Quick form. We confirm one closed off-plan transaction. ~24-hour turnaround. Approval rate ~60%." },
              { q: "Will you share my client list?", a: "Never. Your list is yours. We never contact your buyers." },
              { q: "What about EcoBeachCity?", a: "Owned by RealHunt's founders. Disclosed on every page where it appears, scored by the same independent methodology." },
              { q: "How do I cancel?", a: "Nothing to cancel — there's nothing to pay. You can delete your account anytime from settings." },
              { q: "Can I propose a project for the index?", a: "Yes. Verified agents and developers can submit projects for review from inside the dashboard." },
            ].map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer flex items-center justify-between gap-6 text-white font-medium list-none">
                  {f.q}
                  <span className="text-rh-gold text-xl leading-none transition group-open:rotate-45">+</span>
                </summary>
                <p className="text-white/60 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-rh-line">
        <div className="max-w-5xl mx-auto px-6 py-28 text-center">
          <h2 className="font-serif text-5xl md:text-6xl text-white leading-[1.05] tracking-tight">
            Stop guessing. <span className="italic text-rh-gold">Start ranking.</span>
          </h2>
          <p className="text-white/70 mt-6 text-lg max-w-2xl mx-auto">
            One index. Every market. Built for the brokers, buyers, and developers who want
            off-plan to grow up.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-rh-gold text-rh-navy font-semibold hover:bg-rh-gold-soft transition"
            >
              Browse the index <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/apply"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md border border-white/15 text-white hover:bg-white/5 transition"
            >
              Apply as agent
            </Link>
          </div>
        </div>
      </section>

      <RHFooter />
    </div>
  );
};

export default IndexNew;
