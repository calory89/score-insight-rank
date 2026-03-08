

## Safe Upgrade Pass 10: World-Class Polish — Phase 1

After a deep audit of the full product, here are the highest-impact improvements grouped into one cohesive upgrade. All additive, no breaking changes.

---

### 1. Skeleton Loading States (Premium Feel)

Replace blank/spinner loading states with proper skeleton screens across Dashboard, Rankings, Discover, and Profile. This makes the app feel instant like Stripe/Linear.

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Skeleton cards while analyses load |
| `src/pages/Discover.tsx` | Skeleton grid while discoveries load |
| `src/components/GlobalRanking.tsx` | Skeleton rows while rankings load |
| `src/pages/Profile.tsx` | Skeleton header + stats while loading |

---

### 2. Empty States with CTAs (Conversion + UX)

Right now, empty pages show nothing or minimal text. Add illustrated empty states with clear CTAs to guide users to their next action.

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Empty state: "No properties yet" with Analyze CTA |
| `src/pages/Discover.tsx` | Empty state: "No discoveries yet" with share CTA |
| `src/pages/Compare.tsx` | Empty state: "Select properties to compare" |

---

### 3. Toast Success Feedback for Key Actions

Add satisfying success toasts for actions that currently happen silently: favoriting, sharing, saving profile, deleting analysis.

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Toast on delete analysis |
| `src/pages/Profile.tsx` | Toast on save profile |

---

### 4. Navbar Mobile Menu Polish

The mobile hamburger menu needs better spacing, visual hierarchy, and the credits badge visible.

| File | Change |
|------|--------|
| `src/components/Navbar.tsx` | Improve mobile menu layout, add credits badge, better spacing |

---

### 5. Database Indexes for Performance

Add indexes on frequently queried columns to speed up rankings, dashboard, and game queries.

| Migration | Change |
|-----------|--------|
| New migration | Index on `analyses(global_score)`, `analyses(user_id, created_at)`, `analyses(city)`, `analyses(country)`, `game_scores(played_at)` |

---

### 6. Error Boundary + Global Error Handling

Add a React error boundary so crashes show a friendly "Something went wrong" page instead of a white screen.

| File | Change |
|------|--------|
| New: `src/components/ErrorBoundary.tsx` | React error boundary with retry button |
| `src/App.tsx` | Wrap routes with ErrorBoundary |

---

### 7. Improved Analysis Page Section Headers

Add clearer visual section dividers and icons to the Analysis report page. Currently sections blend together — adding subtle borders, icons, and better spacing makes the report feel more structured and premium.

| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Better section headers with icons and dividers |

---

### 8. "Back to Top" Button on Long Pages

Analysis reports are 1800+ lines long. Add a floating "back to top" button that appears after scrolling down.

| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Floating scroll-to-top FAB |

---

### Summary

| # | Feature | Impact | Effort |
|---|---------|--------|--------|
| 1 | Skeleton loading states | Premium feel | Medium |
| 2 | Empty states with CTAs | Conversion + UX | Low |
| 3 | Success toast feedback | Polish | Very low |
| 4 | Mobile menu polish | UX | Low |
| 5 | Database indexes | Performance | Very low |
| 6 | Error boundary | Reliability | Low |
| 7 | Analysis section headers | Report quality | Low |
| 8 | Back to top button | UX | Very low |

**0 breaking changes. 0 new pages. ~8 files modified, 1 new component, 1 DB migration.**

