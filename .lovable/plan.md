

## Safe Upgrade Pass 3: Settings Dedup, Subscription Context Enhancement & Lazy Routes

After auditing the current state post-previous upgrades, here are the remaining high-impact, non-breaking improvements:

---

### Problem 1: Settings.tsx still fetches subscriptions independently

Lines 51-58 in `Settings.tsx` query `subscriptions` directly instead of using `useSubscription()`. This causes a redundant network request on every Settings page visit. However, Settings also needs `billing_period_end` and `stripe_subscription_id` which the context doesn't expose.

**Fix:** Expand `SubscriptionContext` to also expose `billingPeriodEnd` and `stripeSubscriptionId`. Then refactor `Settings.tsx` to use `useSubscription()` instead of its own fetch, eliminating the duplicate query.

### Problem 2: No route-level code splitting

All pages are eagerly imported in `App.tsx` (lines 10-24). Index.tsx already lazy-loads its sections, but the route-level pages like Admin (791 lines), Analysis (1900+ lines), Dashboard (731 lines) are all bundled upfront. Most users never visit `/admin` or `/compare`.

**Fix:** Wrap non-critical route pages with `React.lazy()` and `Suspense` in `App.tsx`. Keep Index eager (it's the entry point). Lazy-load: Admin, Analysis, Compare, Rankings, Tickets, Discover, Profile, Settings, Privacy, Terms, ResetPassword.

### Problem 3: SubscriptionContext doesn't expose billing metadata

Settings needs `billing_period_end` to show renewal date and `stripe_customer_id` for portal links. Currently it fetches this separately.

**Fix:** Expand the context's `select` to include `billing_period_end, stripe_customer_id, stripe_subscription_id` and expose them.

### Problem 4: PricingSection still has redundant subscription query

`PricingSection.tsx` likely fetches subscription data to determine current plan for button states. Should use `useSubscription()`.

**Fix:** Check and refactor if needed.

---

### Implementation Plan

| Priority | File | Change |
|----------|------|--------|
| **High** | `src/contexts/SubscriptionContext.tsx` | Add `billingPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId` to context |
| **High** | `src/pages/Settings.tsx` | Replace local subscription fetch with `useSubscription()` |
| **High** | `src/App.tsx` | Add `React.lazy()` for non-critical route pages |
| **Med** | `src/pages/Analysis.tsx` | Verify share button uses `toast` not `alert` |

**4 files modified. No new files. No database migrations. No breaking changes.**

