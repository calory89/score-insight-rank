

# Upgrade: Forensic Intelligence Report -- Display All Data + New Sections

## The Problem

The edge function already generates 20+ forensic metrics (price per m², cap rate, break-even, stress tests, investor fit, assumptions, etc.) stored inside `score_explanations.forensic`, but the Analysis page shows NONE of them. The current report is ~40% of its potential.

## What We Will Add (All Sections)

### A. Display Existing Hidden Data (Already Generated, Not Shown)

**1. Deal Quality Card**
- Price per m² and per sqft
- Micro-market median price per m²
- Premium/discount % vs median (color-coded: green = discount, red = premium)
- Fair value range estimate
- Visual gauge: "Overpriced by +8.7% vs local median"

**2. Yield & Returns Card**
- Cap rate %
- Gross yield %
- Net yield % (after expenses)
- Gross annual rent
- Net annual rent

**3. Cash Flow Simulation Card**
- Monthly cash flow (unleveraged)
- Leveraged cash flow at 75% LTV
- Visual: positive = green, negative = red

**4. Break-Even Analysis Card**
- Break-even purchase price
- Break-even monthly rent
- Clear numeric display

**5. Stress Test Card**
- Market drop -15% scenario (estimated value)
- Rental decline -10% scenario (yield impact)

**6. Capital Efficiency & Risk-Return**
- Capital efficiency score (0-100 gauge)
- Risk-return quadrant visual (2x2 matrix with property dot plotted)

**7. Investor Fit Card**
- "Best For" list (green checkmarks)
- "Not Ideal For" list (red X marks)

**8. Assumptions Disclosure**
- Annual appreciation, rental growth, vacancy rate, maintenance, interest rate, operating expenses
- Transparent footer card

**9. Opportunity Cost**
- Return gap vs best alternative
- One-line verdict

### B. NEW Data to Generate (Edge Function Additions)

**10. Neighborhood Intelligence**
- Walk score estimate (0-100)
- Transit score estimate (0-100)
- Nearest airport distance
- Tourist/expat demand level
- Safety/crime context
- School quality indicator

**11. Comparable Sales Table**
- 3-5 recent comparable transactions
- Each with: address, price, size, price/m², date sold
- Shows how subject property compares

**12. Rental Comp Analysis**
- 3-4 similar rentals in the area
- Monthly rent, size, price/m²/month
- Shows rental income potential grounded in reality

**13. Cost Breakdown**
- Estimated closing costs (notary, tax, agency fees)
- Annual property tax estimate
- Annual insurance estimate
- Annual maintenance estimate
- Total Year-1 cost of ownership

**14. Mortgage Scenario Table**
- 3 scenarios: 60% LTV, 75% LTV, 90% LTV
- Monthly payment, total interest, cash-on-cash return for each

**15. Exit Strategy Analysis**
- Best exit window (years)
- Estimated selling costs (%)
- Net proceeds after 5 years (base case)
- Internal Rate of Return (IRR)

**16. Market Context Snapshot**
- Average days on market in the area
- Year-over-year price change %
- Supply/demand ratio
- New construction pipeline

**17. Property Description Summary**
- Key features extracted from listing (terrace, views, elevator, parking, pool, etc.)
- Renovation status
- Energy rating if available
- Floor/orientation

**18. Investment Decision Summary**
- Structured verdict block with checkmarks/X:
  - Capital growth asset? Y/N
  - Yield-optimized? Y/N
  - Strong liquidity? Y/N
  - Low regulatory risk? Y/N
  - Cash-flow positive? Y/N

### C. Visual Enhancements

**19. Property Image**
- Extract listing photo URL via Firecrawl (already scraping, just need to capture image)
- Display hero image at top of report

**20. Comparison Radar Chart**
- 5-axis radar chart comparing this property vs market average across: ROI, Stability, Demand, Risk, Liquidity

**21. Score Trend Sparkline on Dashboard**
- Small visual on dashboard cards showing score relative to market

## Technical Implementation

### Edge Function Changes (`analyze-property/index.ts`)

Add new fields to the AI tool schema:

```text
neighborhood_scores: { walk_score, transit_score, nearest_airport, tourist_demand, safety_rating }
comparable_sales: [{ address, price, size_sqm, price_per_sqm, date_sold }]  (3-5 items)
rental_comps: [{ address, monthly_rent, size_sqm, rent_per_sqm }]  (3-4 items)
cost_breakdown: { closing_costs, annual_tax, annual_insurance, annual_maintenance, total_year1 }
mortgage_scenarios: [{ ltv, monthly_payment, total_interest, cash_on_cash }]  (3 scenarios)
exit_strategy: { best_exit_years, selling_costs_pct, net_proceeds_5yr, irr }
market_context: { avg_days_on_market, yoy_price_change, supply_demand_ratio, new_construction }
property_features: [string]  (extracted key features like "sea views", "elevator", "terrace")
energy_rating: string
floor_info: string
renovation_status: string
investment_classification: { capital_growth, yield_optimized, strong_liquidity, low_regulatory_risk, cash_flow_positive }
listing_image_url: string  (extracted from scraped content)
```

All new fields stored inside `score_explanations.forensic` (no DB migration needed).

### Frontend Changes (`Analysis.tsx`)

Complete redesign of the report layout with all new sections. Organized in this order:

1. Hero (with image if available) + badges + price + key specs
2. Global Score circle + Subscores
3. Deal Quality metrics (price/m², premium/discount, fair value)
4. Yield & Cash Flow side-by-side
5. Break-Even + Mortgage Scenarios
6. Stress Tests + Risk-Return Matrix
7. Neighborhood Intelligence
8. Comparable Sales table
9. Rental Comps table
10. Cost Breakdown
11. Property Features + Description
12. Pros / Cons / Red Flags / Opportunities (existing, keep)
13. 5-Year Scenarios + Charts (existing, keep)
14. Exit Strategy + IRR
15. Investment Classification verdict
16. Investor Fit (Best For / Not For)
17. Opportunity Cost vs alternatives
18. Capital Efficiency Score
19. Assumptions Disclosure (transparent footer)
20. Alternatives section (existing, enhanced with reasoning)

### No Database Migration Required
All new fields fit inside the existing `score_explanations` JSONB column under the `forensic` key.

### Estimated Scope
- Edge function: ~80 new lines (schema additions + prompt updates)
- Analysis.tsx: Major expansion (~400-500 new lines for all sections)
- No new dependencies needed (recharts already installed for radar chart)

