

## Next Improvement: Analysis.tsx Modularization

The three batches from the original plan are complete. The single highest-impact remaining work is **splitting Analysis.tsx** (1,984 lines — the largest file in the codebase) into composable sub-components. This is a pure architecture improvement with zero user-facing changes.

---

### What to implement

**Extract 6 sections from Analysis.tsx into dedicated components:**

| New Component | Lines to Extract | Purpose |
|---|---|---|
| `src/components/analysis/AnalysisScoreCard.tsx` | Score ring, verdict, classification, confidence, percentile, market rank display | ~120 lines |
| `src/components/analysis/AnalysisRadar.tsx` | RadarChart with 5 dimensions + score pills | ~80 lines |
| `src/components/analysis/AnalysisROISection.tsx` | ROI projections, yield trend chart, upside/downside scenarios, investment calculator trigger | ~150 lines |
| `src/components/analysis/AnalysisRedFlags.tsx` | Red flags list, why-not-90 items, opportunity signals | ~100 lines |
| `src/components/analysis/AnalysisProsCons.tsx` | Pros/cons two-column layout | ~60 lines |
| `src/components/analysis/AnalysisHeader.tsx` | Back button, address, city/country, property details (beds, baths, sqm, year), image, price badge | ~100 lines |

**Result**: Analysis.tsx drops from ~1,984 lines to ~1,300 lines as orchestrator. Each extracted component receives props from the parent `AnalysisData` object. No logic changes, no UI changes, no API changes.

### What stays in Analysis.tsx
- Data fetching & state management
- Loading state (FomoLoader — already extracted but not yet imported)
- AI chat, share panel, negotiation letter, portfolio modal orchestration
- Score explanations accordion
- Price history timeline integration

### Safety
- All components receive typed props from `AnalysisData`
- No routing changes
- No database changes
- No edge function changes
- Pure refactor — identical rendered output

