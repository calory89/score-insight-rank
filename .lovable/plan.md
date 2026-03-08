

## Next Batch: Admin CRM Enhancement + SEO + Micro-Polish

After auditing the full codebase, the product is solid across frontend, backend, and UX. The next highest-impact improvements are: expanding the Admin CRM with missing data views, adding structured SEO data, and micro-polishing remaining rough edges.

---

### 1. Admin — Contact Requests Panel
The `contact_requests` table exists with RLS policies but has **no UI panel** in `/admin`. Add a "Contacts" tab showing all submissions with email, company, message, source, and date. Include CSV export. This closes an operational blind spot — enterprise leads are being collected but invisible.

### 2. Admin — Analyses Intelligence Tab
Add an "Analyses" tab to `/admin` with:
- Full list of all analyses (address, city, country, score, price, user email, date)
- Filter by country and city dropdowns (populated from real data)
- CSV export
- Click to view any analysis

This is the core CRM intelligence tool — seeing what properties are being analyzed globally, filtering by market. Data already exists via the `admin-data` edge function.

### 3. SEO — Structured Data (JSON-LD) on Landing Page
Add `Organization` and `WebApplication` JSON-LD structured data to `Index.tsx` for Google rich results. Add `BreadcrumbList` schema on Analysis pages. Pure SEO value, zero UI change.

### 4. SEO — Meta Tags on All Public Pages
Add proper `<title>` and `<meta description>` to pages that currently lack them: Rankings, Game, Search, Privacy, Terms. Use `useDocumentMeta` which already exists. Quick wins for search indexing.

### 5. Dashboard — Empty State Polish
When a user has zero analyses, the dashboard shows stats bar with all zeros and an empty card list. Replace with a proper empty state: illustration/icon + "Paste your first property URL to get started" + prominent CTA. This improves first-time user experience significantly.

### 6. Performance — Memoize Heavy Computations
Dashboard recalculates `avgScore`, `countriesAnalyzed`, and sorts analyses on every render. Wrap in `useMemo`. Same for filtered users in Admin. Zero-risk performance improvement.

---

### Summary

| # | Change | Type | Impact |
|---|--------|------|--------|
| 1 | Admin Contact Requests panel | Frontend | Operational visibility |
| 2 | Admin Analyses intelligence tab | Frontend | CRM power tool |
| 3 | JSON-LD structured data | SEO | Search visibility |
| 4 | Meta tags on all pages | SEO | Indexing coverage |
| 5 | Dashboard empty state | UX | First-time experience |
| 6 | useMemo optimizations | Performance | Render efficiency |

**Operational power + SEO + polish. Zero feature bloat.**

