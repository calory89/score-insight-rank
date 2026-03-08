

## Next Batch: Security, Performance & Database Hardening

The product has strong feature coverage. The highest-ROI improvements now are in areas that prevent scaling problems, improve speed, and harden security — the invisible foundations that separate a prototype from a production-grade startup.

---

### 1. Database Indexing Migration
Add indexes on the most-queried columns to prevent performance degradation as data grows:

```sql
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_global_score ON analyses(global_score DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_slug ON analyses(slug);
CREATE INDEX IF NOT EXISTS idx_analyses_city_country ON analyses(city, country);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_analysis_id ON favorites(analysis_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
```

One migration, zero risk, massive query speedup as tables grow.

### 2. Edge Function Input Validation
Harden all edge functions (`analyze-property`, `ai-chat`, `create-checkout`, `admin-data`, `analyze-lead`) with:
- Zod-style input validation (URL format, string length limits, type checks)
- Rate limiting headers (return 429 after N requests per minute per user)
- Sanitized error responses (never leak stack traces)

Focus on `analyze-property` and `ai-chat` as highest-traffic endpoints.

### 3. Navbar — Notifications Bell (Lightweight)
Add a bell icon to the Navbar that shows a simple dropdown with recent activity:
- "Your analysis is ready" (when returning from loading)
- "Welcome to Pro!" (after subscription)
- Stored in localStorage, no DB table needed yet
- Red dot badge when unread

This is the foundation for real-time notifications later without overengineering now.

### 4. Dashboard — Skeleton Loading Polish
The dashboard currently shows `DashboardCardSkeleton` but the stats bar and input area appear before data loads, causing layout shift. Wrap the entire dashboard content in a coordinated loading state that shows a cohesive skeleton (stats + input + cards) simultaneously.

### 5. Landing Page — Keyboard Shortcut Hint Polish
The hero input shows "⌘K" but this hint isn't styled or visible on mobile. Add a visible `kbd` element on desktop only, and remove the hint text on mobile where keyboard shortcuts don't apply.

### 6. Admin — Export CSV for All Tables
Add a CSV export button to the Users, Analyses, Newsletter, and Contacts tabs in `/admin`. Uses client-side CSV generation from the already-fetched data — no new backend work. Critical for operational control.

---

### Summary

| # | Change | Type | Impact |
|---|--------|------|--------|
| 1 | Database indexes | Migration | Query speed at scale |
| 2 | Edge function validation | Backend | Security + reliability |
| 3 | Notifications bell | Frontend | Engagement foundation |
| 4 | Dashboard skeleton polish | Frontend | Perceived speed |
| 5 | Hero input kbd hint | Frontend | Mobile UX polish |
| 6 | Admin CSV export | Frontend | Operational control |

**Infrastructure + polish batch. Zero feature bloat. Production-grade hardening.**

