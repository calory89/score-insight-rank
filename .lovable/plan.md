

## Full Product Audit — Final Polish Pass

After reviewing every component, page, route, database schema, and the live preview, the app is in strong shape. Here are the remaining issues and high-impact improvements that would elevate this to true unicorn quality.

---

### A. Bugs & Broken Flows

**1. No password reset flow**
`LoginGateModal.tsx` has signup and login but zero "Forgot password?" link. Users who forget their password are stuck. Need to add a forgot password button that calls `resetPasswordForEmail` and create a `/reset-password` page to handle the recovery token.

**2. Footer newsletter input has no visual validation feedback**
The email input has `required` and `type="email"` but no visible error state. If a user types an invalid email and submits, the browser blocks it silently with no styled feedback. Add a simple visual error state.

**3. `Analysis.tsx` uses `type AnalysisData = any` (line 62)**
This loses all TypeScript safety for the most important page in the app. Should use the generated Supabase types.

---

### B. Conversion & Growth (High Impact)

**4. No share/referral mechanism on analysis reports**
The analysis page (`/analysis/:id`) has no share button. This is the single most viral moment — a user sees a great score and wants to share it. Add a "Share Report" button that copies a shareable URL (`/r/:slug`) and offers native Web Share API on mobile. This is the #1 growth lever.

**5. No empty state on Dashboard when user has zero analyses**
When a new user goes to Dashboard with no analyses, they see... nothing. This is a critical activation moment. Add an engaging empty state with a CTA to analyze their first property.

**6. No onboarding nudge after first signup**
After creating an account, the user lands on whatever page they were on with no guidance. Add a brief welcome toast or redirect to dashboard with a "Welcome! Paste your first property URL" prompt.

---

### C. SEO (Remaining Gaps)

**7. Analysis pages (`/r/:slug`) have no server-rendered meta tags**
These are the most SEO-valuable pages but since this is an SPA, social crawlers see the generic `index.html` meta tags. The `useDocumentMeta` hook updates `<title>` and `<meta>` client-side, which Google can index but Facebook/Twitter/LinkedIn cannot. This is a known SPA limitation — note it but don't block on it.

**8. Missing `id="methodology"` alongside `id="trust"`**
Footer links to `/#trust` (fixed) but the `data-section="methodology"` attribute doesn't work as an anchor target. Some internal references still use `/#methodology`. Add `id="methodology"` as a separate anchor div inside the section.

---

### D. Design Polish (Premium Feel)

**9. Hero section — input border too subtle on focus**
The URL input's focus state (`group-focus-within:opacity-20`) is barely visible. Increase to a clear primary-colored ring on focus for better affordance.

**10. Pricing section — annual toggle needs clearer active state**
The Monthly/Annual toggle uses a custom switch but the visual difference between states is subtle. Add a background color change to the active label.

**11. FAQ section — no "Still have questions?" CTA**
After the FAQ accordion, there's nothing. Add a simple "Still have questions? Contact us" link to reduce support friction.

---

### E. Performance

**12. `SocialProofStats` makes 3 parallel Supabase queries on every landing page load**
These counts rarely change. Add `staleTime` via React Query or cache the result to avoid re-fetching on every visit.

---

### Implementation Plan

| Priority | File | Change |
|----------|------|--------|
| **High** | New: `src/pages/ResetPassword.tsx` | Create password reset page |
| **High** | `src/components/LoginGateModal.tsx` | Add "Forgot password?" link |
| **High** | `src/App.tsx` | Add `/reset-password` route |
| **High** | `src/pages/Analysis.tsx` | Add Share Report button (copy URL + Web Share API) |
| **High** | `src/pages/Dashboard.tsx` | Add empty state for zero analyses |
| **Med** | `src/components/MethodologyPreview.tsx` | Add `id="methodology"` anchor |
| **Med** | `src/components/HeroSection.tsx` | Stronger focus ring on URL input |
| **Med** | `src/components/FAQ.tsx` | Add "Still have questions?" CTA at bottom |
| **Med** | `src/components/Footer.tsx` | Add visual validation on email input |
| **Low** | `src/components/PricingSection.tsx` | Clearer active state on annual toggle |

**Database:** No migrations needed.
**Deletions:** None.
**New files:** 1 (`ResetPassword.tsx`).

