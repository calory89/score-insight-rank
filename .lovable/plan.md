

## Safe Upgrade Pass: Redundant Queries, Subscription Context & Admin UX

After auditing all files, network requests, and the live preview, the product is already very polished. The most impactful remaining improvements are:

---

### Problem 1: Subscriptions query fires 4x on every page load

Network logs confirm 4 identical `GET subscriptions` requests on the landing page alone. The `Navbar` component fetches credits independently, and other pages (Dashboard, Settings) also fetch the same data. This wastes bandwidth and adds latency.

**Fix:** Create a `SubscriptionContext` provider (similar to `AuthContext`) that fetches subscription data once on auth change and exposes `{ plan, creditsUsed, creditsTotal, isPro, loading, refresh }` to all components. Replace all 3+ call sites with `useSubscription()`.

### Problem 2: Navbar duplicates `subscriptions` query on every route change

Because `Navbar` is rendered on every page and has its own `useEffect` with `[user]` dependency, it re-fetches on mount but the data is the same as what Dashboard/Settings already fetch.

**Fix:** Solved by the SubscriptionContext above.

### Problem 3: Dashboard still uses `analyses.length >= FREE_LIMIT` as fallback

Line 433 in Dashboard.tsx: even after the previous fix attempt, the code still falls back to `analyses.length` when `isPro` is false. This counts ALL historical analyses, not current billing period usage.

**Fix:** Use `subscriptionContext.creditsUsed >= subscriptionContext.creditsTotal` instead.

### Problem 4: Admin panel lacks newsletter subscribers view

The database has a `newsletter_subscribers` table but there's no UI to view them. The admin can't see who subscribed from the footer newsletter form.

**Fix:** Add a small `NewsletterPanel` to the admin page showing subscriber count, list, and export capability.

### Problem 5: No keyboard shortcut for the main analysis input

Power users (investors) want to quickly paste and analyze. No keyboard shortcut exists.

**Fix:** Add `Cmd/Ctrl+K` focus shortcut on Dashboard and Hero section inputs.

---

### Implementation Plan

| Priority | Change | Files |
|----------|--------|-------|
| **High** | Create `SubscriptionContext` to centralize subscription data | New: `src/contexts/SubscriptionContext.tsx` |
| **High** | Wrap app with `SubscriptionProvider` | `src/App.tsx` |
| **High** | Replace Navbar subscription fetch with `useSubscription()` | `src/components/Navbar.tsx` |
| **High** | Replace Dashboard subscription fetch with `useSubscription()` | `src/pages/Dashboard.tsx` |
| **High** | Fix free limit check to use `creditsUsed >= creditsTotal` | `src/pages/Dashboard.tsx` |
| **Med** | Add `NewsletterPanel` to admin page | `src/pages/Admin.tsx` |
| **Med** | Add `Cmd+K` keyboard shortcut to focus URL input | `src/components/HeroSection.tsx`, `src/pages/Dashboard.tsx` |

**7 files modified, 1 new file. No database migrations. No breaking changes.**

