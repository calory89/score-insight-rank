

# Fix: Show completed analysis instead of error when backend succeeds but client times out

## Problem
The edge function successfully completes the property analysis and saves it to the database, but the client-side HTTP connection times out before receiving the response. The user sees "Analysis Failed" even though their report is ready in the dashboard.

This happens because:
1. The edge function takes 30-90+ seconds to complete
2. The Supabase client or browser drops the connection before getting the response
3. The `catch` block sets `analyzeError` and shows the error screen
4. The analysis is actually saved in the database

## Solution

### Modify the error handler in `src/pages/Analysis.tsx`

When `runAnalysis` catches an error, **before showing the error screen**, check the database for a completed analysis matching the URL. If found, navigate to it instead of showing the error.

**Changes to `runAnalysis` function (around line 444-461):**

```typescript
const runAnalysis = async (body: any) => {
  setAnalyzing(true);
  setAnalyzeError("");
  setScrapeFailed(false);
  setFomoStep(0);
  try {
    const { data: result, error } = await supabase.functions.invoke("analyze-property", { body });
    if (error) throw error;
    if (result?.scrape_failed) { setScrapeFailed(true); setAnalyzing(false); return; }
    if (result?.error) throw new Error(result.error);
    if (result?.listing_type) setListingType(result.listing_type);
    if (result?.data?.id) navigate(`/analysis/${result.data.id}`, { replace: true });
  } catch (e: any) {
    // CHECK DB FIRST: the analysis may have completed despite the client error
    if (body.url && body.url !== "manual-entry") {
      const normalizedUrl = body.url.split("#")[0].replace(/\/$/, "");
      const { data: saved } = await supabase
        .from("analyses")
        .select("id")
        .ilike("url", `${normalizedUrl}%`)
        .not("global_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (saved && saved.length > 0) {
        // Analysis completed! Navigate to it
        setAnalyzing(false);
        navigate(`/analysis/${saved[0].id}`, { replace: true });
        return;
      }
    }
    // Only show error if no saved result was found
    setAnalyzeError(e.message || "Analysis failed");
    setAnalyzing(false);
    setSubmittingFallback(false);
  }
};
```

This is a minimal, targeted fix. When the client connection fails, it queries the database for a matching completed analysis. If found, the user is redirected to their report. If not found, the error is shown as before.

## Why this works
- The edge function saves the analysis to the database before returning the HTTP response
- Even if the HTTP response is lost, the data is already persisted
- A quick database query (milliseconds) confirms whether the work was done

