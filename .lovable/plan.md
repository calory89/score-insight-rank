

## Lead Score Enhancement: Website Scraping + Content-Based Scoring

You're right — currently the lead score is based only on the manually typed fields (company name, email, industry). The system should **read the actual website/URL you paste** and extract real data to build a much smarter score.

---

### Current Problem

The `analyze-lead` edge function receives only text fields and asks the AI to "guess" a score. No actual page content is read — the AI is hallucinating context.

### Solution

Upgrade `analyze-lead` to **fetch and read the website URL** before sending to AI, so scoring is based on real scraped data.

---

### Changes

#### 1. Edge Function: Scrape the URL before AI analysis

| File | Change |
|------|--------|
| `supabase/functions/analyze-lead/index.ts` | Add a `fetch()` call to the provided website URL, extract page title + meta description + first 3000 chars of body text. Pass this real content to the AI prompt so scoring is grounded in actual data. |

The AI prompt will be updated to score based on:
- **What the company actually does** (from their website content)
- **Company size signals** (team pages, office locations)
- **Industry match** (real estate, property, investment signals)
- **Technology sophistication** (modern site vs basic site)
- **Pain point signals** (mentions of manual processes, scaling, etc.)

#### 2. Update AI Prompt with explicit scoring rubric

| Criteria | Points |
|----------|--------|
| Website exists and is accessible | +15 |
| Industry match (real estate/property) | +20 |
| Company size signals (team, offices) | +15 |
| Corporate email (not gmail/hotmail) | +10 |
| Pain points detected on website | +15 |
| Technology signals (modern stack) | +10 |
| Base score | +15 |

#### 3. UI: Add URL input prominence in AddLeadModal

| File | Change |
|------|--------|
| `src/pages/Leads.tsx` | Move the website URL field to the top of the form with a prominent "Paste any URL" placeholder. Make it the primary input. |

---

### Flow After Upgrade

1. User pastes URL (e.g., a company website, LinkedIn profile URL, etc.)
2. Edge function fetches the page content (title, description, body text)
3. AI receives **real page content** + any manually entered info
4. Score is based on actual data, not guesses
5. Pain points, summary, and outreach message are all grounded in real content

**2 files modified. 0 breaking changes. Existing leads unaffected.**

