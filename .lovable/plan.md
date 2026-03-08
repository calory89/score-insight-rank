

## Batch 4 — Backend Hardening & Database Optimization

After 3 batches of frontend polish, the product looks premium. This batch shifts focus to backend/database improvements and a few remaining frontend gaps that meaningfully improve quality.

---

### 1. Database Indexes for Performance
**Migration SQL**

The most impactful backend change. Add indexes on the most queried columns to make the product feel instant at scale:
- `analyses(user_id, created_at DESC)` — Dashboard listing
- `analyses(global_score DESC)` — Rankings & Game queries
- `analyses(country)` — Admin filtering by country
- `page_visits(created_at DESC)` — Admin visits panel
- `page_visits(session_id)` — Session grouping
- `favorites(user_id)` — Dashboard favorites
- `profiles(user_id)` — Profile lookups (unique)

### 2. Compare Page — Add BottomNav + Optimize Query
**File**: `src/pages/Compare.tsx`

- Missing `BottomNav` (mobile users can't navigate away)
- Currently fetches `select("*")` for all user analyses in the picker — should select only columns needed for the picker UI (id, address, city, country, global_score, price, image_url, created_at)

### 3. Admin Panel — Top-Level Stat Cards
**File**: `src/pages/Admin.tsx`

Add 4 summary stat cards above tabs using existing edge function data: Total Users, Total Analyses, New This Week, Active Today. These were planned in Batch 2 but the admin file needs verification for current state.

### 4. Edge Function Rate Limiting
**File**: `supabase/functions/analyze-property/index.ts`

Add a simple rate-limit check: query `analyses` count for the user in the last hour, reject if > 20. Prevents abuse and protects AI API costs.

### 5. Settings Page — Add BottomNav
**File**: `src/pages/Settings.tsx`

Missing `BottomNav` — mobile users can't navigate from settings without using browser back.

---

### Summary

| # | Change | Type | Impact |
|---|--------|------|--------|
| 1 | Database indexes | Migration | Performance at scale |
| 2 | Compare: BottomNav + query optimization | Frontend | Mobile UX + performance |
| 3 | Admin stat cards | Frontend | Operational clarity |
| 4 | Rate limiting on analyze | Backend | Security + cost control |
| 5 | Settings BottomNav | Frontend | Mobile UX consistency |

**5 changes. Zero breaking changes. Infrastructure hardening + mobile UX gaps.**

