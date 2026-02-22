
## Fix: ecobeachcity.com Infinite Loading

### Problem
When analyzing `ecobeachcity.com`, the system gets stuck loading for over 1 minute because:
1. The special ecobeachcity override code runs AFTER scraping and AI analysis -- meaning it still scrapes the website (2 attempts, up to 105 seconds total) and calls the AI model before applying the hardcoded data.
2. The FOMO loader reaches "Step 8 of 8" and stays there forever with no timeout or error state.

### Solution

**1. Move ecobeachcity check before scraping (Edge Function)**
- In `supabase/functions/analyze-property/index.ts`, move the ecobeachcity detection and 3-property creation logic to BEFORE the scraping and AI call sections (right after the cache/duplicate checks, around line 472).
- This skips scraping and AI entirely for ecobeachcity.com, making it nearly instant.

**2. Add a timeout to the FOMO loader (Frontend)**
- In `src/pages/Analysis.tsx`, add a safety timeout (e.g., 90 seconds) that shows an error message if the analysis hasn't completed, preventing the user from being stuck indefinitely on any URL.

### Technical Details

**Edge Function change** (`supabase/functions/analyze-property/index.ts`):
- Move the ecobeachcity block (lines 821-908) to right after the duplicate detection block (after line 471), before the scraping logic begins at line 474.
- This ensures when someone searches ecobeachcity.com, it immediately creates/returns the 3 hardcoded properties without any external API calls.

**Frontend timeout** (`src/pages/Analysis.tsx`):
- Add a `useEffect` with a 90-second timeout in the analysis loading flow that sets an error state like "Analysis is taking longer than expected. Please try again."
- This prevents infinite loading for any URL, not just ecobeachcity.
