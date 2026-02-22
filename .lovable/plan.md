

## Fix: ecobeachcity.com Still Returns Old Cached Single Property

### Problem
The ecobeachcity special handling (3 properties) was moved before scraping, but it's STILL after the **global cache check** (lines 386-446). The cache finds the old single analysis (price EUR29,950, 1 bedroom) and returns it immediately -- the ecobeachcity code at line 473 is never reached.

### Solution

**Move the ecobeachcity check BEFORE the global cache check** in the Edge Function.

### Technical Details

**Edge Function** (`supabase/functions/analyze-property/index.ts`):

1. Move the ecobeachcity detection block (lines 473-557) to BEFORE the global cache check (before line 385), right after the URL validation and `manual-entry` checks.
2. This ensures ecobeachcity.com requests immediately hit the special 3-property logic, bypassing both cache checks entirely.

The new order will be:
1. URL parsing and auth
2. **EcoBeachCity check** (returns 3 hardcoded properties instantly)
3. Global cache check
4. Duplicate detection
5. Scraping and AI analysis

**Additionally**, delete the old cached ecobeachcity analysis from the database (the one with id `cbc81c3f-...` that has the wrong price/bedrooms) so it doesn't pollute the rankings with stale data. This will be done via a database migration that cleans up old ecobeachcity records without the correct slug.

