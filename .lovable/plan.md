

## Batch 2 — Premium Polish & Micro-Experience Upgrade

After reviewing the current state of all key files, the product is already well-structured. This batch focuses on the highest-impact refinements that pass the "does this meaningfully improve perceived quality?" filter.

---

### What Gets Improved

#### 1. Navbar — Subtle Active Link Underline (Desktop)
**File**: `src/components/Navbar.tsx`

Currently active links only change color/weight. Add a 2px animated bottom indicator (like Linear/Stripe nav) using a `motion.span` layoutId animation under the active link. This creates a smooth sliding indicator between nav items.

#### 2. Dashboard — Polished Stats Cards with Icons
**File**: `src/pages/Dashboard.tsx`

The 4 stat cards (Total Analyses, Avg Score, Countries, Favorites) lack icons. Add subtle icons (BarChart3, TrendingUp, Globe, Heart) to each card header for better visual scanning. Also add a subtle `hover:shadow-md` transition.

#### 3. PropertyFinder — Instant Search on Enter Key
**File**: `src/components/PropertyFinder.tsx`

Currently users must click the button. Add `onKeyDown` Enter handler on the price slider area and make the search trigger automatically when amenities change (debounced 500ms) for an "instant search" feel.

#### 4. BottomNav — Haptic-Style Press Animation
**File**: `src/components/BottomNav.tsx`

Add `active:scale-95` press feedback on tab buttons for a more tactile mobile experience. Also add a subtle `motion.span` for the top indicator bar.

#### 5. Global — Smooth Page Load Transition
**File**: `src/index.css`

Add a `body` transition for background color changes when switching themes. Add `scroll-padding-top: 4.5rem` to account for the fixed navbar when using anchor links.

#### 6. Admin Panel — Stat Cards at Top
**File**: `src/pages/Admin.tsx`

Add 4 summary stat cards above the tabs (Total Users, Total Analyses, New This Week, Active Today) using the data already fetched from the `admin-data` edge function. These render regardless of which tab is active.

---

### Summary

| # | Change | File | Impact |
|---|--------|------|--------|
| 1 | Animated nav indicator | Navbar.tsx | Premium feel |
| 2 | Stats card icons + hover | Dashboard.tsx | Visual hierarchy |
| 3 | Enter key + auto-search | PropertyFinder.tsx | Usability |
| 4 | Press animation on tabs | BottomNav.tsx | Mobile delight |
| 5 | Scroll padding + theme transition | index.css | Polish |
| 6 | Admin top-level stat cards | Admin.tsx | Operational clarity |

**6 files. Zero breaking changes. Pure refinement.**

