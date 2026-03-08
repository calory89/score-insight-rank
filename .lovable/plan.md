

## Next Batch: Backend Hardening + Database Indexes + Security + Performance

The product's frontend is now polished and feature-rich. The next highest-impact improvements are **backend hardening, database optimization, and security** — the invisible infrastructure that makes a product production-grade.

---

### 1. Database Indexes for Query Performance
The most-queried tables (`analyses`, `page_visits`, `favorites`, `watchlist`) lack indexes beyond primary keys. Add indexes on the columns used in WHERE/ORDER BY clauses across the app.

**Migration SQL:**
- `analyses(user_id)` — Dashboard, admin queries
- `analyses(country)` — Admin intelligence filter
- `analyses(city)` — Admin intelligence filter  
- `analyses(global_score DESC)` — Rankings, Game
- `analyses(created_at DESC)` — Dashboard sort
- `analyses(slug)` — Public report links `/r/:slug`
- `page_visits(session_id)` — Visit tracking updates
- `page_visits(created_at DESC)` — Admin visits panel
- `favorites(user_id, analysis_id)` — Dashboard favorites
- `watchlist(user_id)` — Dashboard watchlist
- `game_scores(user_id)` — Leaderboard
- `profiles(user_id)` — Auth lookups (unique already exists via constraint but explicit index helps)

**Impact:** Faster queries across the entire app, especially as data grows.

### 2. Edge Function Input Validation with Zod
The `analyze-property`, `ai-chat`, `generate-negotiation-letter`, and `investment-quiz` edge functions currently accept unvalidated input. Add Zod schemas to validate request bodies at the entry point of each function.

- `analyze-property`: validate `url` is a valid URL string, max 2000 chars
- `ai-chat`: validate `message` is string max 2000 chars, `context` is optional object
- `generate-negotiation-letter`: validate required fields (address, score, redFlags)
- `investment-quiz`: validate `answers` is array of expected shape

**Impact:** Prevents injection, malformed requests, and edge cases that could crash functions.

### 3. Rate Limiting on Edge Functions
Add simple in-memory rate limiting to the `analyze-property` function (the most expensive operation) using a per-user counter with a sliding window. Limit to 10 requests per minute per user.

**Impact:** Prevents abuse, protects API costs.

### 4. Admin — Error Logs Enhancement
The `error_logs` table exists and has an admin panel, but the edge functions don't consistently log errors. Add structured error logging to `analyze-property` and `ai-chat` functions so all failures are captured with:
- `error_type` (scrape_timeout, ai_rate_limit, validation_error, etc.)
- `url` 
- `user_id` and `user_email`
- `metadata` (stack trace, response status)

**Impact:** Full operational observability — every failure is visible in the admin panel.

### 5. Game — Duplicate `useEffect` Fix + `useDocumentMeta` on Missing Pages
`Game.tsx` has duplicate `useEffect(() => { loadProperties(); }, [])` calls (lines 51-57). Remove the duplicate. Also add `useDocumentMeta` to `Profile.tsx`, `Compare.tsx`, `Settings.tsx`, and `Discover.tsx` where missing or incomplete.

**Impact:** Code quality + SEO coverage.

### 6. Security — Admin Email Hardcoding Audit
The admin email `rrppspain@gmail.com` is hardcoded in multiple places (Navbar, Admin page, edge functions, DB function). Consolidate to use only the `is_admin()` database function for all checks. The Navbar currently checks `user?.email === "rrppspain@gmail.com"` client-side — this should use a server-side check or at minimum a centralized constant.

**Fix:** Create a shared `ADMIN_EMAIL` constant in `src/lib/constants.ts` and use it everywhere in frontend. The DB function `is_admin()` already handles backend checks correctly.

**Impact:** Maintainability + reduces risk of inconsistent access control.

---

### Summary

| # | Change | Type | Impact |
|---|--------|------|--------|
| 1 | Database indexes on 12 columns | Database | Query speed at scale |
| 2 | Zod validation on 4 edge functions | Security | Input safety |
| 3 | Rate limiting on analyze-property | Security | Abuse prevention |
| 4 | Structured error logging in edge functions | Backend | Operational visibility |
| 5 | Duplicate useEffect fix + meta tags | Code quality + SEO | Correctness |
| 6 | Admin email constant consolidation | Security | Maintainability |

**Infrastructure hardening. Zero UI changes. Maximum production readiness.**

