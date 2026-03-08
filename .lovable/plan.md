

## App Review: Bugs, Inconsistencies & Improvements

After reviewing every component, here are the issues found and what needs fixing:

---

### Bugs (Breaking)

1. **Runtime crash: `Cannot read properties of null (reading 'useRef')`** -- The Radix Accordion in `FAQ.tsx` is crashing due to a React 18 compatibility issue. This is the `CollectionProvider` error in the console. Fix: wrap the Accordion rendering to ensure proper mounting.

2. **Framer Motion `ref` warning in `LiveActivityToast.tsx`** -- `AnimatePresence` + `motion.div` triggers a React 18 ref warning. Fix: use `forwardRef` or wrap the animated element properly.

3. **Footer links to `/privacy` and `/terms` are 404** -- No routes exist for these pages. Users clicking them get the NotFound page.

4. **StickyMobileCTA overlaps BottomNav** -- For authenticated users on mobile, both the sticky CTA bar AND the bottom navigation bar are fixed at `bottom: 0`, stacking on top of each other.

---

### Inconsistencies

5. **"Risk Level" still appears in two places** -- `MethodologyPreview.tsx` line 8 and `FAQ.tsx` line 32 still say "Risk Level" instead of "Safety Score" (the rename was done everywhere else).

6. **CommunityFeedPreview shows nothing** -- The `property_reviews` table is empty (confirmed by network requests returning `[]`), so the entire section renders `null`. The landing page has a gap where this section should be. Fix: show mock/placeholder data when no real reviews exist.

---

### Performance Issues

7. **LiveActivityToast queries the database every 25 seconds** -- This is excessive for a cosmetic FOMO feature. Should fetch once and rotate through cached results.

8. **GlobalRanking and AlternativesSection both query the same data** -- Two separate sections on the landing page both fetch top-scored analyses independently. Redundant network calls.

---

### UX Improvements

9. **MediaLogos looks like placeholder text** -- Just grey text names ("TechCrunch", "Bloomberg") with no styling. Looks unfinished and hurts credibility. Fix: style them as proper logo-like text with better typography, or use SVG/icon representations.

10. **GlobalRanking search bar has no auth gate** -- Unauthenticated users can paste URLs but won't be able to complete the analysis flow properly (no login gate like the hero has).

---

### Implementation Plan

**Files to modify:**
- `src/components/MethodologyPreview.tsx` -- Rename "Risk Level" to "Safety Score"
- `src/components/FAQ.tsx` -- Rename "Risk Level" to "Safety Score" in FAQ answer
- `src/components/LiveActivityToast.tsx` -- Fix ref warning, fetch data once and rotate from cache
- `src/components/StickyMobileCTA.tsx` -- Hide when user is authenticated (BottomNav takes over)
- `src/components/CommunityFeedPreview.tsx` -- Add fallback mock reviews when DB is empty
- `src/components/MediaLogos.tsx` -- Better visual styling for the trust bar
- `src/components/GlobalRanking.tsx` -- Add auth gate to the search bar
- `src/components/Footer.tsx` -- Change /privacy and /terms to anchor links or simple modal pages

**New files:**
- `src/pages/Privacy.tsx` -- Basic privacy policy page
- `src/pages/Terms.tsx` -- Basic terms of service page
- Update `src/App.tsx` -- Add routes for /privacy and /terms

**No database changes required.**

