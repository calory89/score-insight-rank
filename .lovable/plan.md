

## Next Improvement Batch: Refinement & Completion

After reviewing the current state, the product is architecturally solid with good feature coverage. The previous batches delivered indexes, extracted components, admin analytics, and empty states. The highest-impact remaining work is **completing the refactoring that was started but not finished** (Analysis.tsx at 1,984 lines, Dashboard.tsx at 780 lines still have inline duplicated code) and adding final polish touches.

### What to implement

**1. Complete Dashboard.tsx refactor** -- The `UpgradeModal` and `BulkAnalyzeModal` components were extracted to `src/components/dashboard/` but Dashboard.tsx still defines them inline (lines 32-60+). Replace inline definitions with imports from the extracted modules.

**2. NotificationsBell empty state** -- Already has a basic empty state (lines 132-136) with icon + text. This is adequate. No change needed.

**3. Admin User Detail Modal** -- Add a clickable user row in Admin Users tab that opens a dialog showing that user's analyses, achievements count, and portfolio count. Uses data already fetched by the admin-data edge function.

**4. MarketDirectory/MarketPulse skeleton polish** -- Already implemented in previous batch. Verified present. No change needed.

### Implementation details

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Remove inline `UpgradeModal` (~30 lines), import from `@/components/dashboard/UpgradeModal` |
| `src/pages/Admin.tsx` | Add user detail dialog: click a user row → dialog with analyses list, stats. ~80 lines of new UI code using existing Dialog component |
| `src/components/admin/AdminUserDetail.tsx` | New component: receives `UserData`, renders analyses table, stat cards for achievements/portfolio/scouts |

### Not changing
- Analysis.tsx refactor (too large for this batch, risk of breaking the most critical page)
- No new tables, no new edge functions, no design changes
- All existing functionality preserved

