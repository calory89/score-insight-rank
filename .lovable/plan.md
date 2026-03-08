

## Full Audit: Bugs, Design Issues, and SEO Gaps

After reviewing every component, route, and configuration file, here's what's preventing this from being a unicorn-level product:

---

### SEO Issues (Critical)

1. **No sitemap.xml** -- Google can't efficiently discover pages. Need `public/sitemap.xml` with all public routes (/, /rankings, /discover, /privacy, /terms, /r/:slug for analysis pages).

2. **No dynamic page titles** -- Every page shows the same `<title>` from index.html. Each route needs its own title and meta description (Rankings page should say "Top Properties Worldwide | RealHunt", Privacy should say "Privacy Policy | RealHunt", etc.). Use a simple `useEffect` with `document.title` on each page.

3. **SPA routing not SEO-friendly** -- React Router pages won't be indexed properly without meta tags per page. Add a `useDocumentTitle` hook and apply it to every page component.

4. **Missing `<meta>` for subpages** -- /rankings, /discover, /privacy, /terms have no Open Graph or description meta tags. Search engines and social shares will show generic info.

5. **robots.txt is good** but references no sitemap. Add `Sitemap: https://score-insight-rank.lovable.app/sitemap.xml`.

6. **Canonical URL is wrong for published domain** -- index.html has `rel="canonical"` pointing to the lovable.app preview URL. Should point to the published URL or be dynamic.

7. **Analysis pages (/r/:slug) need structured data** -- Each property analysis should have JSON-LD schema for `Product` or `Review` to appear rich in search results.

---

### Design & UX Issues

8. **`App.css` has leftover Vite boilerplate** -- `#root { max-width: 1280px; margin: 0 auto; padding: 2rem; }` is constraining the entire app layout and adding unwanted padding. This file should be cleaned or deleted entirely since all styling is in Tailwind/index.css.

9. **Vite dedupe missing** -- The stack overflow hint mentions duplicate React instances causing hooks crashes. Add `resolve.dedupe` to `vite.config.ts` for stability.

10. **GlobalRanking search bar has no auth gate** -- Unauthenticated users can paste URLs and navigate to `/analysis/loading` which may fail without auth. Should show LoginGateModal like HeroSection does.

11. **Privacy & Terms pages lack Footer** -- These pages have Navbar but no Footer, making them feel incomplete and unprofessional.

12. **MediaLogos still looks like placeholder text** -- Grey italic text is not convincing. Style as proper typographic logos with distinct visual weight, letter-spacing, and opacity effects.

13. **Default theme set to "light" in App.tsx** but `index.html` has `class="dark"` -- This creates a flash of wrong theme on load. Should be consistent (both dark).

---

### Implementation Plan

**New files:**
- `public/sitemap.xml` -- Static sitemap with all public routes
- `src/hooks/useDocumentMeta.ts` -- Hook to set page title + meta description per route

**Modified files:**
- `src/App.css` -- Delete all Vite boilerplate content (the file is overriding Tailwind)
- `vite.config.ts` -- Add `resolve.dedupe` for React stability
- `public/robots.txt` -- Add sitemap reference
- `index.html` -- Fix canonical URL
- `src/App.tsx` -- Change defaultTheme to "dark" to match index.html
- `src/pages/Index.tsx` -- Add useDocumentMeta
- `src/pages/Rankings.tsx` -- Add useDocumentMeta
- `src/pages/Discover.tsx` -- Add useDocumentMeta
- `src/pages/Privacy.tsx` -- Add Footer + useDocumentMeta
- `src/pages/Terms.tsx` -- Add Footer + useDocumentMeta
- `src/pages/Dashboard.tsx` -- Add useDocumentMeta
- `src/pages/Analysis.tsx` -- Add dynamic useDocumentMeta based on property data
- `src/components/GlobalRanking.tsx` -- Add auth gate to search bar
- `src/components/MediaLogos.tsx` -- Better typographic styling

**No database changes required.**

