
# Fix: "Analysis Failed" Timeout Error

## Problem
When analyzing certain Zillow properties, the analysis takes longer than the 90-second client-side safety timeout. The edge function involves multiple steps (scraping with retries, multi-property detection, AI analysis) that can exceed this limit, especially for Zillow pages that are JavaScript-heavy.

## Root Cause
- The client (`Analysis.tsx` line 349) has a **90-second safety timeout** that shows "Analysis is taking longer than expected"
- The edge function can take up to **150+ seconds** when:
  - First scrape attempt fails (45s timeout)
  - Second scrape retry runs (60s timeout)  
  - Multi-property detection AI call runs (~10s)
  - Main AI analysis runs (~15-30s)
- Total worst case: ~150 seconds, well above the 90s client limit

## Solution

### 1. Increase client-side safety timeout
- **File**: `src/pages/Analysis.tsx`
- Change the safety timeout from **90 seconds to 180 seconds** (3 minutes)
- This gives the edge function enough time to complete even with scrape retries

### 2. Update the timeout error message
- Make the error message more helpful, suggesting the user try again or that the property site may be difficult to access

## Technical Details

**Change in `src/pages/Analysis.tsx` (line ~349-351):**
- `setTimeout(() => { ... }, 90000)` changes to `setTimeout(() => { ... }, 180000)`
- Update error message to: "Analysis is taking longer than expected. The property website may be slow or protected. Please try again."

This is a minimal, targeted fix that addresses the timeout without needing to restructure the edge function architecture.
