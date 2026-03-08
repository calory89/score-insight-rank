

## Product Audit: Safe Upgrade Pass

After reviewing the entire codebase -- every page, component, edge function, database schema, and CSS -- the product is already strong. Here are the remaining high-impact, non-breaking improvements:

---

### A. Bugs & Broken Flows

**1. `LoginGateModal` uses `alert()` for password reset feedback**
Line 148 in `LoginGateModal.tsx` calls `alert("Check your email...")` -- this is jarring and un-premium. Replace with an inline success message using the existing `error` state pattern (repurposed as a `message` state).

**2. `SocialProofStats` fires 3 Supabase queries on every landing page visit with no caching**
Lines 29-33 in `SocialProofStats.tsx` run `select count` on `analyses`, `profiles`, and `property_reviews` on every render. Add a simple `sessionStorage` cache so it only fetches once per session.

**3. Dashboard free limit check compares `analyses.length` (all user analyses ever) vs `FREE_LIMIT` (5)**
Line 425 in `Dashboard.tsx`: `analyses.length >= FREE_LIMIT` counts ALL analyses ever made, not just this billing period. Should check `subscriptions.credits_used` vs `subscriptions.credits_total` instead, which already exists in the database.

**4. `type AnalysisData = any` in Analysis.tsx (line 62)**
The most important page loses all TypeScript safety. Replace with a proper interface using the fields actually accessed throughout the 1900-line component.

---

### B. Conversion Improvements

**5. No welcome toast after first signup**
After creating an account via `LoginGateModal`, the user just sees the modal close. Add a welcome toast from `AuthContext` on the `SIGNED_IN` event when the user was just created (check `created_at` vs now < 30s).

**6. Forgot password UX: only visible after switching to "Sign In" mode**
The "Forgot password?" link is hidden unless the user toggles to Sign In mode AND enters email mode. Most users will never find it. Show it in the email form regardless of `isSignUp` state.

**7. Dashboard "Analyze" button doesn't validate URL format**
Users can type "hello" and get redirected to the loading page, which will fail. Add basic URL validation before navigating.

---

### C. Performance

**8. Analysis.tsx is 1,893 lines**
This is the largest file and contains 7+ sub-components (`FomoLoader`, `InlineReportPreview`, `ReadyReportCard`, `SubscoreBar`, `ConfidenceBadge`, `MetricCard`, `SectionHeader`, `Section`). While refactoring the whole file is risky, the sub-components at the top (lines 1-660) are self-contained and could be extracted. For now, mark as tech debt -- no breaking change.

**9. No `staleTime` on any React Query usage**
The app uses `@tanstack/react-query` but most data fetching is done via raw `useEffect` + `useState`. The queries in `SocialProofStats` and `Dashboard` re-fetch on every mount. Adding `sessionStorage` caching to `SocialProofStats` is the quickest win.

---

### D. Design Polish

**10. Navbar credits badge only shows for `plan === "free"`**
Line in `Navbar.tsx` checks `creditsInfo.plan === "free"` to show the badge. Pro users should also see their credit usage (e.g., "42/300 Pro"). Change to show for all plans.

**11. Analysis page share button should use toast instead of alert**
The share button added in the previous pass likely uses clipboard copy -- ensure it uses `toast` for feedback, not `alert`.

---

### Implementation Plan

| Priority | File | Change |
|----------|------|--------|
| **High** | `src/components/LoginGateModal.tsx` | Replace `alert()` with inline success message; show "Forgot password?" in both signup and login email forms |
| **High** | `src/components/SocialProofStats.tsx` | Add `sessionStorage` cache (5-min TTL) to avoid 3 queries per visit |
| **High** | `src/pages/Dashboard.tsx` | Fix free limit check to use `subscriptions.credits_used` instead of `analyses.length`; add URL validation |
| **Med** | `src/contexts/AuthContext.tsx` | Add welcome toast on first signup (check `SIGNED_IN` event + `created_at`) |
| **Med** | `src/components/Navbar.tsx` | Show credits badge for all plans, not just free |
| **Med** | `src/pages/Analysis.tsx` | Add proper `AnalysisData` interface instead of `any` |
| **Low** | `src/pages/Analysis.tsx` | Verify share button uses toast, not alert |

**7 files modified. No new files. No database migrations. No breaking changes.**

