

## Safe Upgrade Pass 7: Product Polish & Growth Improvements

After auditing the current state, here are the highest-impact improvements across UX, conversion, and engagement.

---

### 1. Game page: No-auth access + CTA funnel

Currently the Game page requires no auth to play (good), but the share text and empty state could be stronger. Also, the game fetches from `analyses` which has RLS -- unauthenticated users likely get 0 results.

**Fix:**
- Add a public RLS policy or use an edge function to serve random game properties
- Show a signup CTA after every game round for non-logged-in users (not just at the end)
- Add OG meta tags for `/game` so shared links have a preview card

### 2. Landing page: Add Game CTA as social proof hook

The landing page has no mention of the viral game. Adding a "Play the Deal or No Deal Game" CTA after the HowItWorks section would drive engagement from new visitors.

**Fix:** Add a small promotional section on `Index.tsx` between existing sections, linking to `/game`.

### 3. Navbar: Add Game link for logged-in desktop users

Desktop users have no way to reach `/game` except via BottomNav (mobile only). The desktop navbar should include a "Game" link.

**Fix:** Add "Game" to the desktop navbar links alongside Rankings.

### 4. Profile page: Empty state for new users

When a user has 0 analyses, the profile shows "0" everywhere with no guidance. Should show an encouraging empty state with a CTA to analyze their first property.

**Fix:** Add conditional empty state in Profile when `stats.total === 0`.

### 5. Share clipboard fallback feedback

In `Game.tsx` and `ReferralCard.tsx`, when `navigator.share` is unavailable and clipboard is used, there's no toast feedback in the Game page.

**Fix:** Add toast notification after clipboard copy in the Game share handler.

### 6. BottomNav: Haptic-like active indicator

The BottomNav has no visual indicator beyond color change. Add a small dot or pill under the active tab for clearer state.

### 7. Score reveal: Show property location context

During game reveal, show whether the score means "above/below average for that city" to make it educational and sticky.

### 8. SEO: Add `useDocumentMeta` to Game page

The Game page has no meta tags. Add title/description for SEO and social sharing.

---

### Implementation Plan

| Priority | Change | Files |
|----------|--------|-------|
| **High** | Add Game link to desktop Navbar | `Navbar.tsx` |
| **High** | Add `useDocumentMeta` to Game page | `Game.tsx` |
| **High** | Add toast on share clipboard fallback in Game | `Game.tsx` |
| **High** | Add Game promo section on landing page | `Index.tsx` |
| **Med** | Active dot indicator on BottomNav | `BottomNav.tsx` |
| **Med** | Empty state CTA on Profile for 0 analyses | `Profile.tsx` |
| **Med** | Better empty state for Game when not enough data | `Game.tsx` |

**0 new files, ~5 files modified. No database migrations. No breaking changes.**

