

## Comprehensive Quality Upgrade to 100/100

After auditing the full codebase, here are the remaining high-impact improvements organized into 5 implementation tasks.

---

### 1. Dashboard: Use extracted DashboardPropertyCard component

**Problem**: `Dashboard.tsx` (480 lines) has ~150 lines of inline card rendering (lines 322-469) that duplicates the already-existing `DashboardPropertyCard` component. This also causes the console warning about refs on function components.

**Fix**: Replace the inline card markup with `<DashboardPropertyCard>`, passing the existing props. This cuts ~130 lines and eliminates code duplication.

---

### 2. Admin.tsx Modularization (1,034 lines → ~200 lines)

**Problem**: Admin.tsx is the second-largest file. It contains 6 inline panel components that should be extracted.

**Extract into `src/components/admin/`**:

| Component | Lines | File |
|---|---|---|
| `BatchAnalysisPanel` | 62-181 | `AdminBatchPanel.tsx` |
| `AdminTicketsPanel` | 183-334 | `AdminTicketsPanel.tsx` |
| `ErrorLogsPanel` | 336-505 | `AdminErrorLogsPanel.tsx` |
| `ContactRequestsPanel` | 507-571 | `AdminContactsPanel.tsx` |
| `AnalysesIntelligencePanel` | 573-672 | `AdminAnalysesPanel.tsx` |
| `NewsletterPanel` | 674-728 | `AdminNewsletterPanel.tsx` |

Admin.tsx becomes a pure orchestrator with tabs and stat cards.

---

### 3. Database Indexing for Query Performance

Add indexes on the most frequently queried columns to improve response times at scale:

```sql
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_country ON analyses(country);
CREATE INDEX IF NOT EXISTS idx_analyses_slug ON analyses(slug);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
```

---

### 4. Admin Cohort & Retention Analytics

Enhance `AdminAnalyticsTab.tsx` with:
- **Retention cohort grid**: Group users by signup week, show % active in weeks 1-4 as a heatmap
- **Conversion funnel**: Signup → First Analysis → 3+ Analyses → Pro upgrade (visual funnel)
- Uses existing data from the `users` prop, no new queries needed

---

### 5. LazyImage Integration in Dashboard & Discover Cards

Replace raw `<img>` tags in `DashboardPropertyCard` with the already-created `LazyImage` component to activate blur-shimmer placeholders and native lazy loading across the product.

---

### Safety

- All changes are pure refactors or additive
- No routing, database schema, or edge function changes (indexes are additive)
- No removal of any existing feature
- Identical rendered output for modularization tasks

