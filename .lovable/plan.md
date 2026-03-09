

# Strategic Product Upgrade Plan — Next Iteration

Following Safe Upgrade Mode, this plan focuses on the highest-impact improvements across multiple dimensions while continuing the feature roadmap.

---

## Phase 1: Feature #4 — Price Drop Tracker & Opportunity Alerts

**What**: Leverage the existing `watchlist` table (already has `initial_price`, `latest_price`, `price_delta`, `score_delta` columns) to build a price monitoring system with visual opportunity alerts.

**Implementation**:
- Create edge function `check-price-drops` that re-scrapes watched properties, compares prices, and updates `watchlist` records
- Add a "Price Drops" section to the Dashboard showing properties with negative price deltas, ranked by opportunity value
- Show visual badges on watchlist items: green "Price Drop!" chip with percentage, updated score comparison
- Create notifications when price drops are detected (insert into `notifications` table)

**No new tables needed** — all columns already exist in `watchlist`.

---

## Phase 2: Feature #5 — Investment Strategy Templates

**What**: Pre-built strategy profiles that filter and rank the user's analyses based on investment criteria.

**Implementation**:
- Add strategy selector to Dashboard/Discover with 5 templates:
  - Cash Flow Maximizer (sort by ROI potential, filter risk < 60)
  - Capital Appreciation (sort by market stability + demand strength)
  - Digital Nomad Rental (filter beach/urban, high demand)
  - Retirement Haven (low risk, high market stability)
  - Quick Flip (high ROI potential, low price)
- Each template applies client-side filters/sorting to existing analyses data
- Show strategy match percentage on each property card

**No backend changes** — pure frontend filtering logic using existing analysis fields.

---

## Phase 3: Database Performance — Add Critical Indexes

**What**: Add indexes to improve query performance for the most common access patterns.

**SQL Migration**:
```sql
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_city_country ON analyses(city, country);
CREATE INDEX IF NOT EXISTS idx_analyses_global_score ON analyses(global_score DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_created ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_properties(user_id);
```

---

## Phase 4: UX Polish — Micro-Improvements

**What**: Small, high-impact refinements across existing surfaces.

1. **Empty state improvements**: Add illustrated empty states with clear CTAs to Portfolio, Watchlist, and Discover pages
2. **Loading skeleton consistency**: Ensure all data-loading pages use consistent skeleton patterns
3. **Toast feedback**: Add success toasts for all destructive/important actions (delete analysis, remove from portfolio, etc.)
4. **Navbar active state**: Add subtle underline/highlight for the current active route in mobile bottom nav

---

## Phase 5: Admin Enhancements

**What**: Add revenue tracking and user lifecycle insights to the Admin CRM.

1. **Conversion funnel widget**: Show signup → first analysis → 5th analysis → upgrade funnel with percentages
2. **User cohort view**: Group users by signup week, show retention curves
3. **Quick actions**: Add "Send notification" button per user in the admin user list

---

## Summary

| Phase | Feature | Effort | New Tables | New Edge Functions |
|-------|---------|--------|------------|-------------------|
| 1 | Price Drop Tracker | Medium | 0 | 1 (check-price-drops) |
| 2 | Strategy Templates | Low | 0 | 0 |
| 3 | DB Indexes | Low | 0 | 0 |
| 4 | UX Polish | Low | 0 | 0 |
| 5 | Admin Enhancements | Medium | 0 | 0 |

All changes are additive and non-breaking. No existing features are modified or removed.

