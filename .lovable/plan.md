

## Audit: Remaining Bugs, Conversion Gaps, and Design Issues

After reviewing every component, route, CSS config, and the live preview, here's what still needs fixing:

---

### Bugs (Must Fix)

**1. FinalCTA counter is static -- never updates**
Line 47 in `FinalCTA.tsx`: `{Math.floor(37 + Math.sin(Date.now() / 10000) * 15)}` evaluates ONCE on render. Unlike the Hero which has a proper `useEffect`/`setInterval`, this counter is dead. Needs the same interval pattern.

**2. Newsletter form in Footer doesn't persist data**
The "Subscribe" form in `Footer.tsx` sets local state `subscribed=true` but never sends the email anywhere. It's a dead form -- users think they subscribed but nothing happens. Should save to a `newsletter_subscribers` table or at minimum use the API waitlist pattern.

**3. CommunityFeedPreview "Join the conversation" button has no auth gate**
Line 147: clicking navigates directly to `/discover` without checking auth. Non-logged-in users land on Discover which may require auth. Should follow the same `LoginGateModal` pattern used elsewhere.

**4. Landing page has too many similar sections competing**
`CommunityFeedPreview` and `Testimonials` show nearly identical content (star ratings + quotes from users). `DiscoverPromo` and `CommunityAskCTA` both promote the same Discover feature. This dilutes conversion by repeating the same message 4 times. Remove `CommunityFeedPreview` entirely -- Testimonials already covers social proof. Merge `CommunityAskCTA` into `DiscoverPromo`.

---

### Conversion Improvements

**5. No "How many analyses left" indicator for logged-in users**
Once users sign up, there's no visible indicator of their remaining free analyses. Adding a small badge in the Navbar ("3/5 free left") creates urgency to upgrade.

**6. ScorePreview section lacks a CTA**
The ScorePreview is the most visual, compelling section on the page but has zero call-to-action beneath it. Add "Try it with your property" button.

**7. ExampleReportsCarousel section lacks heading context**
The label says "Last Reports Searched by Real Users" but there's no h2 heading. This section needs a proper heading for both SEO and visual hierarchy: "Real Reports from Real Properties".

---

### Design Polish

**8. MediaLogos section looks fake**
Text-only logos with 30% opacity look placeholder-ish. Either commit to proper typographic treatment (different weights, sizes, clear visual distinctness) or replace with "As used by teams at..." with company type icons instead.

**9. No hover card effects on interactive cards**
`HowItWorks`, `TrustSection`, `MethodologyPreview` cards have `hover:border-primary/15` but no shadow elevation or scale. Add `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300` for premium feel.

**10. FAQ section has no schema markup**
FAQPage JSON-LD structured data would make FAQs appear in Google search results as rich snippets, driving organic traffic.

---

### Implementation Plan

**Files to modify:**
- `src/components/FinalCTA.tsx` -- Add `useState`/`useEffect` interval for live counter (same pattern as Hero)
- `src/pages/Index.tsx` -- Remove `CommunityFeedPreview`, merge CommunityAskCTA content into DiscoverPromo section. Add CTA button below ScorePreview. Add proper h2 heading to ExampleReports section
- `src/components/DiscoverPromo.tsx` -- Add "Ask the Hunters" content block (from CommunityAskCTA) into this section
- `src/components/CommunityFeedPreview.tsx` -- Remove from landing (keep component for /discover page)
- `src/components/HowItWorks.tsx` -- Add hover elevation effect to cards
- `src/components/TrustSection.tsx` -- Add hover elevation effect
- `src/components/MethodologyPreview.tsx` -- Add hover elevation effect
- `src/components/MediaLogos.tsx` -- Restyle as "Trusted by investors from" with company-type icons instead of fake news logos
- `src/components/FAQ.tsx` -- Add FAQPage JSON-LD structured data via `useEffect`
- `src/components/Navbar.tsx` -- Add remaining analyses badge for logged-in free users

**Database migration needed:** Create `newsletter_subscribers` table to persist Footer email signups, then update `Footer.tsx` to insert emails.

**No changes to:** Hero, Pricing, Auth, Analysis pages -- these are already solid.

