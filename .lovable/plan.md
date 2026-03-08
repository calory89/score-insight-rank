

## Audit: Final Round -- Bugs, Duplicates, and Polish

After reviewing every component, route, CSS, database, and the live preview, here's what remains:

---

### Bugs (Must Fix)

**1. TrustSection is duplicated -- renders TWICE on landing page**
`TrustSection.tsx` still exists as a standalone component AND its content was merged into `MethodologyPreview.tsx` (lines 81-112). In `Index.tsx`, BOTH are rendered (line 79 renders `MethodologyPreview`, and line 18 imports `TrustSection` which is still rendered). Users see the same 4 trust badges twice. Remove `TrustSection` from `Index.tsx` since it's already inside MethodologyPreview.

**2. APISection still rendered as standalone section**
The previous plan said to fold APISection into Pricing, but it's still rendered as a standalone section in `Index.tsx` line 81. It should be removed from the landing page -- its waitlist functionality already works but it adds unnecessary length. The Enterprise plan already covers API access.

**3. `newsletter_subscribers` table has no unique constraint on email**
The Footer catches duplicate error code `23505`, but there's no unique constraint on the `email` column. Duplicate emails can be inserted. Need to add a unique index.

**4. Testimonial cards lack hover effects**
All other cards in the landing page have `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`, but Testimonial cards (line 51) have none. Inconsistent premium feel.

---

### SEO Issues

**5. Missing `id="methodology"` on MethodologyPreview section**
Footer links to `/#methodology` but the section element has no `id` attribute. Clicking "Methodology" in the footer does nothing.

**6. `#trust` anchor is broken**
Navbar links to `/#trust` (line 47), but since TrustSection is being duplicated/merged, the `id="trust"` needs to live on MethodologyPreview instead. Currently the standalone TrustSection still has it, but once we remove TrustSection from Index, the anchor will break.

**7. Missing `<meta name="theme-color">` for mobile browsers**
No theme-color meta tag in `index.html`. Mobile browsers (Chrome, Safari) show a white/default toolbar color instead of matching the dark theme.

---

### Design & Conversion

**8. Landing page still too long -- 15 sections**
Current: Hero → SocialProofStats → MediaLogos → HowItWorks → ScorePreview → ExampleReports → Testimonials → ValueProposition → AlternativesSection → Pricing → DiscoverPromo → **TrustSection (duplicate)** → MethodologyPreview → **APISection (should be removed)** → FAQ → FinalCTA → Footer. Removing duplicates brings it to 13 sections -- a much tighter funnel.

**9. No urgency badge in Navbar for logged-in users**
Previous audits proposed a "3/5 free" badge. Still not implemented. This is a key conversion lever for upgrades.

**10. Pricing cards lack hover elevation**
Pricing cards have conditional `glow-primary` for highlighted but no hover effect on any card. Should match the hover pattern used everywhere else.

---

### Implementation Plan

**Files to modify:**
- `src/pages/Index.tsx` -- Remove `TrustSection` and `APISection` imports and renders. Brings section count from 15 to 13.
- `src/components/MethodologyPreview.tsx` -- Add `id="trust"` to the section element (so navbar anchor works)
- `src/components/Testimonials.tsx` -- Add `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300` to cards
- `src/components/PricingSection.tsx` -- Add hover elevation to pricing cards
- `src/components/Navbar.tsx` -- Add "X/5 free" badge for logged-in free users (query `subscriptions` table)
- `index.html` -- Add `<meta name="theme-color" content="#0a0c10">` for dark mode mobile toolbar
- **Database migration:** Add unique constraint on `newsletter_subscribers.email`

**No files to delete** -- TrustSection and APISection components stay (may be used elsewhere), just removed from landing page.

