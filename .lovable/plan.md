

## Conversion & Unicorn-Level Improvements

After a deep review of every section, here's what's still holding this back from being a true 100/100 conversion machine:

---

### 1. Hero Section: No Visual Proof Above the Fold

The hero has a great headline and input bar, but below it shows a carousel that loads asynchronously and may show nothing initially. The `ScorePreview` component exists but is **never rendered** (imported but unused in HeroSection). This is a major missed opportunity.

**Fix:** Add a compact, static score preview card directly in the hero (below the input, above the carousel) showing what a report looks like. This is the single highest-impact conversion lever -- users need to SEE the product before they use it.

---

### 2. No Urgency/Scarcity Signals

The page says "5 free analyses" but there's no countdown, no "X people analyzing right now", no visual urgency. Unicorn landing pages create time pressure.

**Fix:** Add a subtle live counter below the hero input: "🔴 47 properties being analyzed right now" pulling from real data or a smart estimate.

---

### 3. FinalCTA is Weak

"Stop guessing. Know if it's a good deal." is good copy but the CTA just scrolls to top. No reinforcement, no testimonial snippet, no urgency.

**Fix:** Add a mini testimonial quote + the live counter inside the FinalCTA section. Make it a self-contained conversion unit.

---

### 4. Testimonials Lack Photos and Stars

Text-only testimonials with initials feel generic. Adding star ratings and avatar photos (even stock/AI-generated) dramatically increases trust.

**Fix:** Add 5-star visual ratings and better avatar styling to each testimonial card.

---

### 5. ValueProposition Section is Too Passive

The "Don't Buy Blind" section is just text. No visual, no interaction, no CTA button. It's a dead zone in the scroll.

**Fix:** Add a CTA button ("Analyze Now -- Free") and a visual element (the score circle or a comparison graphic).

---

### 6. CommunityAskCTA Routes Non-Users to Pricing

When a non-logged-in user clicks "Join Free", they go to `/#pricing` which is confusing. They should see the login gate directly.

**Fix:** Show `LoginGateModal` instead of navigating to pricing for non-authenticated users.

---

### 7. DiscoverPromo Routes Non-Users to Pricing Too

Same issue. Non-logged-in users clicking "Get Started -- Free" go to `/#pricing`. Should trigger login gate.

**Fix:** Same pattern -- show `LoginGateModal`.

---

### 8. No JSON-LD Structured Data

Analysis pages have no structured data for Google rich results. This is critical SEO for property-related searches.

**Fix:** Add JSON-LD `Product`/`Review` schema to analysis pages dynamically.

---

### 9. Missing `og:image` Meta Tag

No Open Graph image is set. When someone shares the app on Twitter/LinkedIn/WhatsApp, there's no preview image. This kills viral sharing.

**Fix:** Add a default `og:image` meta tag in `index.html` and update `useDocumentMeta` to support dynamic OG images per page.

---

### 10. APISection Has No Action

"Join the Waitlist" button does nothing. Dead CTA = broken trust.

**Fix:** Make it open a simple email input modal or link to the contact form.

---

### Implementation Plan

**Files to modify:**
- `src/components/HeroSection.tsx` -- Render ScorePreview below the input + add live "analyzing now" counter
- `src/components/FinalCTA.tsx` -- Add mini testimonial + live counter + stronger visual treatment
- `src/components/Testimonials.tsx` -- Add star ratings to each card
- `src/components/ValueProposition.tsx` -- Add CTA button and visual element
- `src/components/CommunityAskCTA.tsx` -- Replace navigate to pricing with LoginGateModal for non-users
- `src/components/DiscoverPromo.tsx` -- Same fix as CommunityAskCTA
- `src/components/APISection.tsx` -- Wire "Join Waitlist" to a functional email capture
- `src/hooks/useDocumentMeta.ts` -- Add og:image support
- `index.html` -- Add default og:image meta tag
- `src/pages/Analysis.tsx` -- Add JSON-LD structured data for rich search results

**No database changes required.**

