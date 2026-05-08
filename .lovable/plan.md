# RealHunt Surgical Rebuild — Sprint 1 Plan

This spec is ~30 days of work across 35 sections. I will not attempt it in one shot. I'll execute in vertical slices following the build order you defined, starting with **Sprint 1 (Days 1–7): the loop**. Each subsequent sprint becomes its own plan after you review the previous slice live.

This first plan covers **only** what's needed to get a working agent from paste → score → branded PDF → WhatsApp share, on the new paper-white design system, with auth and a free tier.

---

## Scope of this sprint (and only this sprint)

### 1. Design system overhaul (paper, notarial, light)
- Replace current emerald/dark tokens in `src/index.css` and `tailwind.config.ts` with the exact palette you specified: `--bg #FAFAF7`, `--surface #FFFFFF`, `--surface-2 #F4F2EC`, `--ink #0F1115`, `--ink-muted`, `--ink-soft`, `--accent #B8924A`, `--good #1F8A4C`, `--warn #B57700`, `--bad #B23A2E`, `--hairline`, `--shadow-soft`.
- Force `defaultTheme="light"` and remove the dark mode class option from `App.tsx`.
- Load Fraunces (variable) + Inter from Google Fonts; map `font-display` → Fraunces, `font-sans` → Inter; enable `tabular-nums` globally on numeric utilities.
- Define button/input/card primitives: 12px radius, 1px hairline, no shadow by default, single gold primary per screen.
- Update `theme-color` meta to `#FAFAF7`.

### 2. New top nav site-wide (RHNav rewrite)
Wordmark left in Fraunces. Right: **Score a property · Rankings · Method · Pricing · Sign in · Open the app →** (gold). Mobile: hamburger sheet with same items + Sign up. Replaces existing nav across `/`, `/homescoring`, `/a/:id`, `/method`, `/pricing`, `/app/*`.

### 3. Landing `/` rebuild (paste-first)
- Hero: "Is this listing actually a good deal?" + subhead + single large URL input with gold Analyze button.
- Source-detection chip on focus + 4 example chips (Dubai off-plan, Marbella resale, London BTL, Miami new build).
- Trust strip: "5 free · No credit card · Cancel anytime".
- Sections: What you get (3 cols), Live demo (static famous listing), Built for agents who close (3 tiles), Methodology teaser (5 rows), Pricing preview (3 cards), Final CTA, quiet footer.
- No carousel, no "as seen in", no stock photos, no video.

### 4. Auth (Supabase) — Sprint 1 subset
- Enable Email+Password (HIBP on) and Google OAuth. Magic link + Apple deferred to Sprint 3.
- Pages: `/auth/sign-up`, `/auth/sign-in`, `/auth/verify-email`, `/auth/reset-password`, `/auth/callback`. All on `--bg`, gold "Continue with Google" prominent.
- Email verification required before "Send to client" (analyses allowed before verification).
- Cloudflare Turnstile deferred unless trivial; basic rate-limit via edge function for now.

### 5. Onboarding wizard `/app/onboarding` (steps 1–4 only)
Role → Brand → First analysis → First send to self. Step 5 (team invite) deferred.

### 6. Brand settings `/app/brand`
Logo upload (Supabase Storage, private bucket, 15-min signed URLs), name, phone (libphonenumber), agency, disclaimer, default PDF language. Live PDF preview to the right. Color locked to gold for free tier.

### 7. Listing ingestion (§31) — 2 adapters live
- Pluggable `adapters/` folder with `fetch(url): ListingDTO` interface.
- **Idealista**: official API (requires partnership — I'll scaffold the adapter + env vars; you submit the partner application Day 0).
- **PropertyFinder**: official partner API (same — scaffold + env).
- Edge function `ingest-listing` with queue, 24h DTO cache keyed on `(source_url, content_hash)`, residential-IP fallback stub.
- DTO never persists raw HTML, only structured fields + thumbnail hot-link URL.
- Failure ladder: 5 retries with backoff → degraded banner → screenshot OCR fallback stub.

### 8. Scorer + LLM (§32)
- **Layer 1 — deterministic scorer**: pure TS function `score(dto): { dim_*, rh_score, confidence_band[] }`, version-tagged `scorer_version`. Stored on every `analyses` row.
- **Layer 2 — LLM verdict**: edge function calls Lovable AI Gateway with **structured output (tool calling)**. Free tier → `google/gemini-3-flash-preview`; Pro → `openai/gpt-5` (placeholder until anthropic available — note: Lovable AI doesn't ship Claude; I'll use the gpt-5 / gemini-3-pro tier and note this divergence from your spec).
- **Hallucination guards**: LLM emits `source_id` only; server reattaches URLs from DTO; numeric claims validated ±0.1 vs scorer; mismatches retry max 2 then fall back to scorer-only.
- Cache key includes `scorer_version + model_version + locale`.
- Golden-set CI deferred to Sprint 2 (50 listings is a separate workstream).

### 9. Result page `/a/:id` redesign
- Editorial brochure layout, `--bg` background, hairlines for structure.
- Header band: breadcrumb + property title + thumbnail (16:10).
- Score block: oversized Fraunces 120px on left, verdict 24px right (stacks on mobile). 5-tile dimension strip below, hairline-separated, no fills.
- Collapsible dimension cards with "why this score" + Sources drawer (real URLs from DTO only).
- Comparables strip (3–5 horizontally scrollable).
- Sticky action bar: **Send to client** (gold), Save, Copy link, Download PDF, Re-analyze (1/h).
- Viral footer band: "Analysis by [Agent] · [Phone] · [Agency] · Powered by RealHunt — Get your own free analysis at realhunt.co" (free tier shows fallback).

### 10. PDF + share pipeline (§8) — the viral loop
- Edge function `render-pdf` using `@react-pdf/renderer` (Puppeteer is too heavy for Supabase edge; I'll use react-pdf which runs in Deno and gives us A4 + Letter, < 800KB target).
- 2-page layout: header band w/ brand → hero composition (no scraped photo, branded composition per §33) → score circle → verdict → 5 mini-rings → comparables. Page 2: numbered citations → methodology footnote → agent disclaimer → QR back to live report → "Powered by RealHunt".
- Async queue (Supabase background task), share sheet shows spinner up to 5s.
- **Share sheet** with three rails: WhatsApp (`wa.me` deep link, pre-filled message), Email (mailto), Copy link (short URL via new `short_links` table, 6-char code).
- OG image edge function for rich link previews (score circle on property photo).
- Tracking: `share.whatsapp`, `share.email`, `share.copy`, `pdf.download`, `report.opened` events into existing `events`-style table.

### 11. Database additions
New tables (migration):
- `agent_brand` — logo_url, primary_color, agent_name, phone, agency, disclaimer, default_pdf_lang.
- `listing_dto_cache` — source_url, content_hash, dto jsonb, fetched_at, expires_at.
- `short_links` — code PK, analysis_id, created_at.
- `share_events` — analysis_id, channel, opened_count, last_opened_at, created_at.
- Add `scorer_version`, `model_version`, `confidence_bands jsonb` columns to existing `analyses` table.

All with RLS: agent reads only their own brand, share_events for their analyses, etc. Cache table is service-role only.

### 12. Free tier gates
- 5 analyses/month per user (already in `subscriptions`).
- Send-to-client locked until email verified.
- PDF watermark "Powered by RealHunt" mandatory on free; removable on Pro+ (post-Stripe in Sprint 2).
- Re-analyze same URL: 1/hour free.

### 13. `/method` skeleton
Three of the five dimensions populated (Developer, Delivery, Legal). Each with: what we check, sources, known limitations, last update date. Other two stubbed with "Methodology under review" + ETA. Ends with `method@realhunt.co` contact line.

### 14. Legal stubs
`/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/imprint` — short but real, EN only Sprint 1. Cookie banner: necessary-only default, three buttons (Reject all / Customize / Accept all), no dark patterns. Choice persisted 12 months.

---

## Explicitly DEFERRED to later sprints (do not build now)
- Inbox / messaging system (Sprint 3)
- Developer onboarding & verification (Sprint 4)
- Stripe checkout + plan upgrades (Sprint 2)
- Batch analyze (50 URLs) (Sprint 2)
- Programmatic ranking pages (Sprint 2)
- Zillow / Rightmove / Redfin / Airbnb adapters (Sprint 2–3)
- i18n beyond EN (Sprint 3)
- 2FA, magic link, Apple OAuth (Sprint 3)
- Chrome extension, WhatsApp bot, embed badge JWT (Sprint 4)
- Affiliate dashboard, admin panel beyond what exists (Sprint 4)
- Full E2E Playwright suite, golden-set CI, axe-core CI (Sprints 2–4)

---

## Technical & spec divergences I need you to confirm

1. **LLM provider**: Spec says Claude Sonnet 4.5 / Opus 4.6. Lovable AI Gateway does not ship Anthropic models — it ships Google Gemini and OpenAI GPT-5. I'll use `google/gemini-3-flash-preview` (free tier) and `openai/gpt-5` (Pro tier). If you want Claude specifically, you'll need to add an Anthropic API key as a secret and I'll wire a separate provider — costs and infra rules change.
2. **PDF engine**: Spec says Puppeteer worker. Supabase Edge Functions run Deno, no headless Chrome. I'll use `@react-pdf/renderer` (Deno-compatible, ~500KB output, great typography). If you insist on Puppeteer, we need an external worker (Render / Fly) and that adds 2 days + ~€20/mo infra.
3. **Listing ingestion partnerships**: Idealista + PropertyFinder partner API approvals take ~2 weeks. I'll scaffold adapters with env-var stubs so you can submit the applications Day 0. In the meantime, I'll wire a generic `cheerio` + `fetch` fallback that works on listings without aggressive bot protection (won't pass Cloudflare).
4. **Existing project surface**: This project has 30+ existing pages (Dashboard, Compare, Game, Quiz, Portfolio, Heatmap, MarketDirectory, etc.) from prior work. Sprint 1 will leave them in place but un-linked from the new nav. We can prune them in Sprint 2 once you confirm what to keep.
5. **Realhunt.co data**: I'll continue using the existing `projects` / `developers` / `countries` tables (1,145 projects already seeded) for the `/rank/...` SEO pages and comparables.

---

## Acceptance for this sprint
- Cold visit → paste URL → score in < 12s → branded PDF downloaded → WhatsApp share opens with pre-filled message. End-to-end on mobile.
- New paper-white design applied site-wide; no dark surfaces remain.
- Auth round-trip works (email+password, Google).
- 5-free-per-month gate enforced.
- Public `/a/:id` renders rich OG previews on WhatsApp.
- `/method` and `/legal/*` exist and are honest.

---

## My questions before I start

A) **Approve the LLM divergence** (Gemini/GPT-5 instead of Claude) or add an Anthropic key now?
B) **Approve the PDF engine divergence** (`react-pdf` instead of Puppeteer)?
C) **Listing ingestion in the interim**: ship Sprint 1 with a generic `cheerio` fallback (works on ~40% of listings, fails on Zillow/Idealista's Cloudflare) and wait for partner APIs, or block Sprint 1 launch on partner approval?
D) **Existing pages**: leave un-linked for now and prune in Sprint 2, or hard-delete them in this sprint?

Once you answer, I execute Sprint 1 end-to-end and ship a private-beta-ready slice.