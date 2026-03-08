

## Next Batch: Strategic Product Expansion — 3 High-Impact Features

After auditing the full codebase, the product is already strong across frontend polish, backend architecture, gamification, and admin tooling. The highest-value gaps remaining are:

1. **Market Pulse — Public SEO Pages** (massive organic growth)
2. **Due Diligence Checklist** (stickiness + real purchase workflow)
3. **AI Property Scout — Smart Alerts** (passive retention)

These three features create the most value because they address the three pillars: **acquisition** (SEO), **activation** (checklist guides the purchase journey), and **retention** (alerts bring users back without effort).

---

### 1. Market Pulse — City Intelligence Pages (SEO Growth Engine)

**What**: Public pages at `/market/:country/:city` showing aggregated intelligence from existing analyses data. No auth required.

**Implementation**:
- New page `src/pages/MarketPulse.tsx` with route in App.tsx
- Query `analyses` table grouped by city/country (public RLS already allows SELECT)
- Display: avg score, avg price, total analyses, score distribution (bar chart), top 5 properties, verdict breakdown
- JSON-LD `Place` schema + `useDocumentMeta` for dynamic SEO titles ("Malaga Real Estate Intelligence | RealHunt")
- Index page at `/market` listing all available cities as a directory
- Add to sitemap.xml
- CTA: "Analyze a property in {city}" → hero input

**Database**: No schema changes needed — aggregates from existing `analyses` table.

**Files**:
- Create `src/pages/MarketPulse.tsx` (city detail page)
- Create `src/pages/MarketDirectory.tsx` (index listing all cities)
- Edit `src/App.tsx` (add routes)
- Edit `public/sitemap.xml` (add market routes)
- Edit `src/components/Footer.tsx` (add Market link)

---

### 2. Due Diligence Checklist (Purchase Workflow)

**What**: After viewing an analysis, users get an interactive checklist tailored to the property's country. Tracks progress. Turns RealHunt from "analysis tool" to "purchase companion."

**Implementation**:
- New DB table `due_diligence_checklists` (user_id, analysis_id, items JSONB, created_at, updated_at) with RLS
- Component `src/components/DueDiligenceChecklist.tsx` renders a pre-defined checklist based on country
- Hardcoded checklist templates per country (Spain, UK, US, Portugal, France, Germany — covers 90% of users) with fallback "General" template
- Items: legal docs, inspections, financial checks, agent questions
- Toggle completion per item, progress bar, persist to DB
- Integrated into Analysis page below the report

**Database migration**:
```sql
CREATE TABLE public.due_diligence_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);
ALTER TABLE public.due_diligence_checklists ENABLE ROW LEVEL SECURITY;
-- Standard user-owns-data RLS policies
CREATE INDEX idx_due_diligence_user ON public.due_diligence_checklists(user_id);
```

**Files**:
- Create `src/components/DueDiligenceChecklist.tsx`
- Edit `src/pages/Analysis.tsx` (add checklist section)
- DB migration

---

### 3. AI Property Scout — Smart Alerts

**What**: Users define criteria (city, min/max budget, min score) and get in-app notifications when a new analysis by any user matches.

**Implementation**:
- New DB table `scout_alerts` (user_id, criteria JSONB, active boolean, created_at)
- New component `src/components/ScoutAlertSetup.tsx` — simple form to define criteria
- Matching logic: After each analysis is saved (in `analyze-property` edge function), query `scout_alerts` where criteria matches, insert notification into `notifications` table (new table)
- Display matches in existing `NotificationsBell` component
- Accessible from Dashboard + Settings

**Database migration**:
```sql
CREATE TABLE public.scout_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scout_alerts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'scout_match',
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_scout_alerts_active ON public.scout_alerts(active) WHERE active = true;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
```

**Files**:
- Create `src/components/ScoutAlertSetup.tsx`
- Edit `src/components/NotificationsBell.tsx` (read from notifications table)
- Edit `src/pages/Dashboard.tsx` (add Scout section)
- Edit `supabase/functions/analyze-property/index.ts` (add scout matching after save)
- DB migration

---

### Implementation Order

| # | Feature | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| 1 | Market Pulse (SEO) | ★★★★★ | Medium | First — zero DB changes, pure frontend |
| 2 | Due Diligence Checklist | ★★★★☆ | Low-Medium | Second — simple table + component |
| 3 | AI Property Scout | ★★★★★ | Medium | Third — requires edge function edit |

All three features integrate naturally into existing flows without breaking anything. Zero existing code removed.

