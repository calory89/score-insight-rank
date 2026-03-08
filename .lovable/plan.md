

## Audit: Final Bugs, SEO Gaps, and Design Issues

After reviewing every component end-to-end, here's what remains:

---

### Bugs

**1. APISection waitlist doesn't persist emails**
`handleSubmit` in `APISection.tsx` just sets `submitted=true` locally. The email is lost. Should insert into `newsletter_subscribers` table (already exists) or a dedicated `api_waitlist` table.

**2. ContactModal in PricingSection doesn't persist data**
The Enterprise "Contact Sales" form (`PricingSection.tsx` lines 182-247) just sets `submitted=true` locally. Email, phone, company, message -- all lost. Should save to a `contact_requests` table.

**3. ScorePreview section has no `id` for SEO anchor**
The ScorePreview section in `Index.tsx` (line 45) has no `id` attribute. The `#score-preview` anchor doesn't work for internal linking or SEO.

**4. ExampleReports section has no `id` for anchor linking**
Line 62 has `id="example-reports"` but no nav link points to it. Should be linkable from the "Real Reports" heading for sharing.

---

### SEO Issues

**5. Sitemap is static and missing key routes**
`sitemap.xml` only has 5 URLs. Missing `/r/:slug` dynamic analysis pages (the most SEO-valuable content). Should mention this is a known limitation since dynamic sitemaps need server-side generation, but we can add a comment and more static routes.

**6. No `hreflang` or language meta tags**
The app targets international users (60+ countries in the phone selector) but has no language indicators beyond `lang="en"`. Add `<meta property="og:locale" content="en_US" />` at minimum.

**7. Canonical URL still uses lovable.app domain**
`index.html` line 12: `<link rel="canonical" href="https://score-insight-rank.lovable.app/" />`. If the app gets a custom domain, this will hurt SEO. Should be noted but the user needs to update when they get a custom domain.

**8. Missing `lastmod` dates in sitemap**
Sitemap entries have no `<lastmod>` timestamps, which Google uses to prioritize crawling.

---

### Design & Conversion

**9. AlternativesSection cards lack hover elevation**
Cards in `AlternativesSection.tsx` (line 98) only have `hover:border-primary/20` but no shadow or translate effect, inconsistent with the rest of the landing page.

**10. ScorePreview section needs a proper h2 heading**
The ScorePreview standalone section (Index.tsx lines 44-58) only has a small `<p>` label "Example Report Preview" but no h2 heading. Bad for SEO and visual hierarchy. Should have something like "See What a Report Looks Like".

**11. Landing page is still too long -- 15+ sections**
The funnel has: Hero → SocialProofStats → MediaLogos → HowItWorks → ScorePreview → ExampleReports → Testimonials → ValueProposition → AlternativesSection → Pricing → DiscoverPromo → TrustSection → MethodologyPreview → APISection → FAQ → FinalCTA → Footer. That's 17 sections. Methodology and Trust can be merged. API section can be folded into the Pricing section as an "Enterprise" add-on mention.

**12. `CommunityAskCTA.tsx` and `CommunityFeedPreview.tsx` are orphaned files**
These files still exist in `src/components/` but are no longer imported anywhere. Dead code should be removed.

---

### Implementation Plan

**Files to modify:**
- `src/components/APISection.tsx` -- Persist waitlist emails to `newsletter_subscribers` table via Supabase insert
- `src/components/PricingSection.tsx` -- Create `contact_requests` table and persist Enterprise contact form data
- `src/pages/Index.tsx` -- Add `id` and h2 heading to ScorePreview section. Merge TrustSection into MethodologyPreview. Remove APISection as standalone (fold into Pricing). Add hover effects to AlternativesSection cards
- `src/components/AlternativesSection.tsx` -- Add `hover:shadow-lg hover:-translate-y-0.5` to cards
- `src/components/TrustSection.tsx` -- Merge trust points into MethodologyPreview as a footer row
- `src/components/MethodologyPreview.tsx` -- Add trust badges row at bottom
- `index.html` -- Add `og:locale` meta tag. Add `lastmod` to sitemap
- `public/sitemap.xml` -- Add `lastmod` dates to all entries
- Delete `src/components/CommunityAskCTA.tsx` and `src/components/CommunityFeedPreview.tsx` (orphaned)

**Database migration needed:** Create `contact_requests` table for Enterprise contact form persistence.

