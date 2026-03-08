

## Assessment: 85/100 — What's Missing for 100

The landing page now has strong structure with 15 sections, community proof, stats, and testimonials. But there are specific gaps that prevent it from being a true 100/100 conversion machine:

---

### What's Missing

**1. FAQ Section** (before Footer)
- Every high-converting SaaS landing page has one. Users have objections — "Is it accurate?", "What platforms do you support?", "Is my data safe?", "Can I cancel anytime?"
- An accordion-based FAQ kills objections right before the final CTA
- Uses existing Radix accordion component

**2. "How Accurate Is It?" / Methodology Transparency Section** (after TrustSection)
- The Trust section says "transparent scoring" but never shows HOW
- A brief section showing the 6 scoring dimensions (ROI, Safety, Demand, Liquidity, Market Strength, Overall) with mini progress bars builds massive credibility
- Differentiates from competitors who hide their methodology

**3. Footer needs real links**
- Currently all links go to `#` — Privacy, Terms, Methodology, Contact are dead
- Add at least a contact email and basic legal pages (even simple ones)
- Add social media links (Twitter/X, LinkedIn)

**4. Mobile sticky CTA bar**
- On mobile, once you scroll past the hero, there's no persistent way to start analyzing
- A small sticky bottom bar with "Analyze Property" that appears after scrolling past the hero dramatically increases mobile conversion

**5. "Live Activity" indicator**
- A subtle floating notification showing "Someone just analyzed a property in Bali" (pulling from real recent analyses)
- Creates urgency and FOMO — proves the platform is alive RIGHT NOW

---

### Technical Plan

**New components:**
- `src/components/FAQ.tsx` — Radix accordion with 6-8 common questions
- `src/components/MethodologyPreview.tsx` — Visual breakdown of the 6 scoring pillars with mini bars
- `src/components/StickyMobileCTA.tsx` — Fixed bottom bar on mobile, appears after hero scroll
- `src/components/LiveActivityToast.tsx` — Periodic toast showing recent real analyses

**Updated files:**
- `src/pages/Index.tsx` — Add FAQ after APISection, MethodologyPreview after TrustSection
- `src/components/Footer.tsx` — Add real contact email, social links, proper structure
- `src/App.tsx` or layout — Add StickyMobileCTA and LiveActivityToast globally on Index

**Final landing page order (additions marked):**
1. Navbar
2. HeroSection
3. SocialProofStats
4. MediaLogos
5. HowItWorks
6. AlternativesSection
7. GlobalRanking
8. CommunityFeedPreview
9. CommunityAskCTA
10. DiscoverPromo
11. Testimonials
12. ValueProposition
13. PricingSection
14. TrustSection
15. **MethodologyPreview** (new)
16. APISection
17. **FAQ** (new)
18. FinalCTA
19. Footer (improved)
20. **StickyMobileCTA** (new, floating)
21. **LiveActivityToast** (new, floating)

**No database changes needed.** LiveActivityToast pulls from existing `analyses` table. Everything else is static content.

