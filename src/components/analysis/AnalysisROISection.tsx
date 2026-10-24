import {
  DollarSign, Ruler, BarChart3, Percent, PiggyBank, TrendingUp,
  Scale, Landmark, AlertTriangle, Compass, Home, Clock, Building2, Shield, Zap, Eye,
} from "lucide-react";
import { scoreColor, scoreBg } from "@/lib/score-utils";
import { Section, SectionHeader, MetricCard } from "./AnalysisHelpers";
import ProGateOverlay from "@/components/ProGateOverlay";
import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

interface AnalysisROISectionProps {
  data: AnalysisData;
  forensic: any;
  curr: string;
  isPro: boolean;
}

const AnalysisROISection = ({ data: d, forensic: f, curr, isPro }: AnalysisROISectionProps) => {
  const premiumPositive = f.premium_discount_pct != null ? f.premium_discount_pct < 0 : null;

  return (
    <>
      {/* Deal Quality Analysis */}
      {(f.price_per_sqm || f.cap_rate || f.fair_value_low) && (
        <Section delay={0.25} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={DollarSign} title="Deal Quality Analysis" subtitle="Price positioning vs market" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {d.size_sqm != null && <MetricCard icon={Ruler} label="Price/m²" value={f.price_per_sqm ? `${curr}${f.price_per_sqm.toLocaleString()}` : undefined} />}
            {d.size_sqm != null && <MetricCard icon={Ruler} label="Price/sqft" value={f.price_per_sqft ? `${curr}${f.price_per_sqft.toLocaleString()}` : undefined} />}
            <MetricCard icon={BarChart3} label="Market Median/m²" value={f.market_median_sqm ? `${curr}${f.market_median_sqm.toLocaleString()}` : undefined} />
            <MetricCard icon={Percent} label="vs Median" value={f.premium_discount_pct != null ? `${f.premium_discount_pct > 0 ? "+" : ""}${f.premium_discount_pct}%` : undefined}
              positive={premiumPositive} sub={f.premium_discount_pct != null ? (f.premium_discount_pct < 0 ? "Below market, discount" : "Above market, premium") : undefined} />
          </div>
          {(f.fair_value_low || f.fair_value_high) && (
            <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Fair Value Range</p>
              <p className="text-sm font-mono font-semibold text-foreground">{f.fair_value_low} · {f.fair_value_high}</p>
            </div>
          )}
        </Section>
      )}

      {/* Yield & Cash Flow (Pro-gated) */}
      <ProGateOverlay isPro={isPro} label="Unlock Yield & Cash Flow Analysis">
      {(f.cap_rate || f.gross_yield || f.monthly_cash_flow) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Section delay={0.28} className="rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={PiggyBank} title="Yield & Returns" />
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={Percent} label="Cap Rate" value={f.cap_rate ? `${f.cap_rate}%` : undefined} />
              <MetricCard icon={Percent} label="Gross Yield" value={f.gross_yield ? `${f.gross_yield}%` : undefined} />
              <MetricCard icon={Percent} label="Net Yield" value={f.net_yield ? `${f.net_yield}%` : undefined} positive={f.net_yield > 5} />
              <MetricCard icon={DollarSign} label="Gross Annual Rent" value={f.gross_annual_rent} />
            </div>
          </Section>
          <Section delay={0.3} className="rounded-2xl border border-border bg-card p-6">
            <SectionHeader icon={TrendingUp} title="Cash Flow Simulation" />
            <div className="space-y-3">
              <MetricCard icon={DollarSign} label="Monthly (Unleveraged)" value={f.monthly_cash_flow}
                positive={f.monthly_cash_flow && !f.monthly_cash_flow.includes("-")} />
              <MetricCard icon={Landmark} label="Leveraged (75% LTV)" value={f.leveraged_cash_flow}
                positive={f.leveraged_cash_flow && !f.leveraged_cash_flow.includes("-")} />
            </div>
          </Section>
        </div>
      )}
      </ProGateOverlay>

      {/* Break-Even + Mortgage Scenarios (Pro-gated) */}
      <ProGateOverlay isPro={isPro} label="Unlock Break-Even & Mortgage Data">
      {(f.break_even_price || f.mortgage_scenarios?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(f.break_even_price || f.break_even_rent) && (
            <Section delay={0.32} className="rounded-2xl border border-border bg-card p-6">
              <SectionHeader icon={Scale} title="Break-Even Analysis" />
              <div className="space-y-3">
                <MetricCard icon={DollarSign} label="Break-Even Price" value={f.break_even_price} />
                <MetricCard icon={DollarSign} label="Break-Even Rent" value={f.break_even_rent} />
              </div>
            </Section>
          )}
          {f.mortgage_scenarios?.length > 0 && (
            <Section delay={0.34} className="rounded-2xl border border-border bg-card p-6">
              <SectionHeader icon={Landmark} title="Mortgage Scenarios" />
              <div className="space-y-2">
                {(f.mortgage_scenarios as any[]).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{s.ltv}% LTV</p>
                      <p className="text-[10px] text-muted-foreground">{s.monthly_payment}/mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-primary">{s.cash_on_cash}% CoC</p>
                      <p className="text-[10px] text-muted-foreground">Interest: {s.total_interest}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
      </ProGateOverlay>

      {/* Stress Tests (Pro-gated) */}
      <ProGateOverlay isPro={isPro} label="Unlock Stress Test Reports">
      {(f.stress_test_market_drop || f.stress_test_rental_decline) && (
        <Section delay={0.36} className="rounded-2xl border border-score-poor/10 bg-score-poor/5 p-6 mb-8">
          <SectionHeader icon={AlertTriangle} title="Stress Tests" subtitle="Downside scenario modeling" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-secondary/50 border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market Drop -15%</p>
              <p className="text-lg font-mono font-bold text-score-poor">{f.stress_test_market_drop}</p>
            </div>
            <div className="rounded-xl bg-secondary/50 border border-border p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rental Decline -10%</p>
              <p className="text-lg font-mono font-bold text-score-average">{f.stress_test_rental_decline}</p>
            </div>
          </div>
          {f.risk_return_quadrant && (
            <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Risk-Return Position</p>
              <p className="text-sm font-semibold text-foreground">{f.risk_return_quadrant}</p>
            </div>
          )}
        </Section>
      )}
      </ProGateOverlay>

      {/* Neighborhood Intelligence */}
      {f.neighborhood_scores && (
        <Section delay={0.38} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={Compass} title="Neighborhood Intelligence" subtitle="Location quality indicators" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {f.neighborhood_scores.walk_score != null && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Walk Score</p>
                <p className={`text-2xl font-mono font-bold ${scoreColor(f.neighborhood_scores.walk_score)}`}>{f.neighborhood_scores.walk_score}</p>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBg(f.neighborhood_scores.walk_score)}`} style={{ width: `${f.neighborhood_scores.walk_score}%` }} />
                </div>
              </div>
            )}
            {f.neighborhood_scores.transit_score != null && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Transit Score</p>
                <p className={`text-2xl font-mono font-bold ${scoreColor(f.neighborhood_scores.transit_score)}`}>{f.neighborhood_scores.transit_score}</p>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBg(f.neighborhood_scores.transit_score)}`} style={{ width: `${f.neighborhood_scores.transit_score}%` }} />
                </div>
              </div>
            )}
            {f.neighborhood_scores.safety_rating && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Safety</p>
                <p className="text-lg font-semibold text-foreground">{f.neighborhood_scores.safety_rating}</p>
              </div>
            )}
            {f.neighborhood_scores.tourist_demand && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tourist Demand</p>
                <p className="text-lg font-semibold text-foreground">{f.neighborhood_scores.tourist_demand}</p>
              </div>
            )}
            {f.neighborhood_scores.nearest_airport && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Nearest Airport</p>
                <p className="text-xs text-foreground">{f.neighborhood_scores.nearest_airport}</p>
              </div>
            )}
            {f.neighborhood_scores.school_quality && (
              <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Schools</p>
                <p className="text-xs text-foreground">{f.neighborhood_scores.school_quality}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Comparable Sales (Pro-gated) */}
      <ProGateOverlay isPro={isPro} label="Unlock Comparable Sales">
      {f.comparable_sales?.length > 0 && (
        <Section delay={0.4} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={BarChart3} title="Comparable Sales" subtitle="Recent transactions in the area" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Address</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">{curr}/m²</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(f.comparable_sales as any[]).map((comp: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3 text-foreground">{comp.address}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-foreground">{comp.price}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.size_sqm} m²</td>
                    <td className="py-2.5 px-3 text-right font-mono text-primary">{curr}{comp.price_per_sqm?.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.date_sold || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Rental Comps */}
      {f.rental_comps?.length > 0 && (
        <Section delay={0.42} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={Home} title="Rental Comparables" subtitle="Similar rentals nearby" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Address</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Monthly Rent</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">{curr}/m²/mo</th>
                </tr>
              </thead>
              <tbody>
                {(f.rental_comps as any[]).map((comp: any, i: number) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 px-3 text-foreground">{comp.address}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-primary">{comp.monthly_rent}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.size_sqm} m²</td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{curr}{comp.rent_per_sqm?.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      </ProGateOverlay>

      {/* Cost Breakdown */}
      {f.cost_breakdown && (
        <Section delay={0.44} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={DollarSign} title="Cost Breakdown" subtitle="Year-1 ownership costs" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard icon={DollarSign} label="Closing Costs" value={f.cost_breakdown.closing_costs} />
            <MetricCard icon={Landmark} label="Annual Tax" value={f.cost_breakdown.annual_tax} />
            <MetricCard icon={Shield} label="Insurance" value={f.cost_breakdown.annual_insurance} />
            <MetricCard icon={Home} label="Maintenance" value={f.cost_breakdown.annual_maintenance} />
            <MetricCard icon={Zap} label="Total Year 1" value={f.cost_breakdown.total_year1} />
          </div>
        </Section>
      )}

      {/* Market Context */}
      {f.market_context && (
        <Section delay={0.46} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={Eye} title="Market Context" subtitle="Local market dynamics" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={Clock} label="Avg Days on Market" value={f.market_context.avg_days_on_market} />
            <MetricCard icon={TrendingUp} label="YoY Price Change" value={f.market_context.yoy_price_change != null ? `${f.market_context.yoy_price_change > 0 ? "+" : ""}${f.market_context.yoy_price_change}%` : undefined}
              positive={f.market_context.yoy_price_change > 0} />
            <MetricCard icon={BarChart3} label="Supply/Demand" value={f.market_context.supply_demand_ratio} />
            <MetricCard icon={Building2} label="New Construction" value={f.market_context.new_construction} />
          </div>
        </Section>
      )}
    </>
  );
};

export default AnalysisROISection;
