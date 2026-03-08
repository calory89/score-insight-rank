

## Safe Upgrade Pass 4: Shared Utilities, Admin Polish & Confirm Dialog

After auditing the codebase post-previous upgrades, here are the remaining high-impact, non-breaking improvements:

---

### 1. Extract duplicated `scoreColor` utility (7 copies)

The exact same `scoreColor` function is copy-pasted in 7 files: `Dashboard.tsx`, `Admin.tsx`, `Analysis.tsx`, `Compare.tsx`, `Discover.tsx`, `ExampleReportsCarousel.tsx`, `GlobalRanking.tsx`. Same for `verdictColor` (2+ copies).

**Fix:** Create `src/lib/score-utils.ts` exporting `scoreColor`, `scoreBg`, `verdictColor`, `riskLabel`. Replace all inline copies with imports.

### 2. Replace native `confirm()` in Admin.tsx with proper dialog

Line 359 uses `confirm("Delete all visible error logs?")` -- blocking and un-premium. Replace with a controlled `AlertDialog` from the existing `@radix-ui/react-alert-dialog` component.

### 3. Dashboard fetches ALL analyses (no user_id filter, relies on RLS)

Line 393: `supabase.from("analyses").select("*").order(...)` -- works because of RLS, but sends all columns including large JSONB fields (`alternatives`, `price_history`, `yield_trend`, `pros`, `cons`, `red_flags`, etc.) that are never displayed on the dashboard cards. This wastes bandwidth.

**Fix:** Select only the columns needed for dashboard cards: `id, url, address, city, country, price, global_score, verdict, risk_level, projected_roi_low, projected_roi_high, market_classification, property_type, image_url, ai_summary, confidence_level, data_source, created_at`.

### 4. Admin users table not responsive on mobile

The 6-column grid (line 681) breaks on small screens. Admin is admin-only so lower priority, but it should at least not break.

**Fix:** Add responsive breakpoints: hide non-essential columns on mobile, stack user info.

### 5. PricingSection doesn't use SubscriptionContext

`PricingSection.tsx` doesn't fetch subscription data at all -- it shows all plans without highlighting the current one. This is a missed conversion opportunity.

**Fix:** Import `useSubscription()` and add a "Current Plan" badge on the user's active plan.

---

### Implementation Plan

| Priority | File | Change |
|----------|------|--------|
| **High** | New: `src/lib/score-utils.ts` | Extract `scoreColor`, `verdictColor`, `riskLabel`, `scoreBg` |
| **High** | 7 files | Replace inline `scoreColor` etc. with imports from `score-utils` |
| **High** | `src/pages/Dashboard.tsx` | Select only needed columns instead of `*` |
| **Med** | `src/pages/Admin.tsx` | Replace `confirm()` with `AlertDialog`; make users table responsive |
| **Med** | `src/components/PricingSection.tsx` | Add "Current Plan" badge using `useSubscription()` |

**1 new file, ~9 files modified. No database migrations. No breaking changes.**

