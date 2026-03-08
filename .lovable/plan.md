

## Next Batch: Frontend Polish + UX Refinement

Based on the deep audit, the product has strong feature coverage and solid architecture. The next highest-impact improvements are **UX polish and frontend refinement** — the details that make users say "wow, this is well built."

---

### 1. Navbar Refinement — Cleaner, More Premium
**Current issue**: Desktop navbar is cluttered with 7+ buttons (Dashboard, Support, Settings, credits badge, email, logout, theme, notifications). Mobile menu lacks notifications bell.

**Fix**:
- Group user actions into a single avatar/profile dropdown (Settings, Support, Sign Out, email display)
- Keep only: nav links, theme toggle, notifications bell, credits badge, profile dropdown
- Add notifications bell to mobile menu
- Net result: cleaner, more Stripe/Linear-like navbar

### 2. Dashboard — Empty State & Stats Skeleton Coordination
**Current issue**: Stats bar and input appear instantly while cards show skeleton, causing visual mismatch. The `PropertyOfTheDay`, `WatchlistSection`, and `SavingsCalculator` render above the "Dashboard" heading, creating odd hierarchy.

**Fix**:
- Move heading above all widgets
- Wrap stats + cards in coordinated skeleton (show all or nothing)
- Add subtle fade-in animation to stats cards

### 3. Footer — Add Discover Link + Game Link
**Current issue**: Footer Product section missing Game and Search links. These are high-engagement features that should be discoverable.

**Fix**: Add Game and Search to footer Product column.

### 4. Landing Page — Section Spacing Consistency
**Current issue**: Mixed `py-12`, `py-16`, `py-20` across sections. Game CTA section uses emoji (🔥) as heading decoration — not premium.

**Fix**:
- Standardize section spacing to `py-16 md:py-24`
- Replace emoji with an icon or remove it
- Add subtle `border-b border-border/30` between sections for visual rhythm

### 5. Login Modal — Polish & Error Handling
**Current issue**: On signup, no indication that email confirmation is needed. User gets silently closed modal which is confusing.

**Fix**:
- After signup, show success state: "Check your email to confirm your account" instead of immediately closing
- Add password minimum length hint (6 chars)

### 6. Mobile Bottom Nav — Active State Polish
**Current issue**: Bottom nav works but the active indicator (top line) is subtle. Icons could use fill states for active tabs.

**Fix**:
- Use filled icon variants for active tab
- Slightly increase icon size differentiation between active/inactive

---

### Summary

| # | Change | Impact |
|---|--------|--------|
| 1 | Navbar cleanup — profile dropdown | Cleaner, more premium feel |
| 2 | Dashboard skeleton coordination | Perceived speed, no layout shift |
| 3 | Footer link additions | Discoverability |
| 4 | Landing section spacing | Visual consistency |
| 5 | Login modal signup feedback | Reduced user confusion |
| 6 | Mobile bottom nav polish | Better mobile UX |

**Pure polish batch. Zero new features. Maximum perceived quality increase.**

