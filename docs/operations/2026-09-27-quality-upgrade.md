# RealHunt quality upgrade — 27 September 2026

Implementation baseline: `524ba98b640b8024930953c78fe0fe587fc6c778`.
Delivery uses GitHub and database/deploy operations, not Lovable's generative chat.

This is an implementation and verification record, not a 100/100 certification. A score requires production measurements and real buyer/developer journeys. Missing listing facts remain missing until checked against a source. No votes, property dimensions, availability dates or commissions were invented.

## Buyer experience and trust

| # | Improvement | Implementation and limit |
|---|---|---|
| 1 | Two mobile columns | 4:3 cards, two columns below 700px. |
| 2 | Clear card information | Price, title, location, area and bedrooms below the photo. |
| 3 | Price hierarchy | Larger asking price; optional rent comparison uses a user-entered amount. |
| 4 | Compact first screen | Shorter hero, weekly podium opt-in, primary search visible. |
| 5 | Buyer navigation | Explore, alerts, map, saved and profile in the mobile bar; other routes retained. |
| 6 | Less image clutter | Price moved below image; essential save/rank/status controls remain. |
| 7 | Reliable photographs | Only versioned small assets are advertised; original/fallback/placeholder recovery. |
| 8 | Mobile gallery | Swipe, counter, original-resolution enlargement, viewed photo restoration. |
| 9 | Accessible gallery | Named controls, Escape, focus return and keyboard focus containment. |
| 10 | Reduced motion | Pause preference, reduced-motion support, slow-connection prefetch limit. |
| 11 | Return to exploration | Saved query, loaded results, scroll and photo positions; five-minute cache. |
| 12 | Prevent stale searches | Query-owned cache and response sequence guards. |
| 13 | Quick view | Essential facts, photos, comparison and next/previous home. |
| 14 | Three-home comparison | Persistent selection, missing-data labels and factual comparison; no fabricated winner. |
| 15 | Search suggestions | Debounced, server-filtered eight-row query; keyboard navigation. |
| 16 | Filter preview | Count matching homes before applying a draft. |
| 17 | Visible active filters | Removable country/type/budget/area chips; sorting retained separately. |
| 18 | Exact budgets | €30,000 preset and preserved custom thresholds from URLs. |
| 19 | Useful empty states | Real counts for wider budget, other countries or removed search text. |
| 20 | Unavailable properties | Clear retired/unavailable state and return link instead of generic failure. |
| 21 | Decision summary | Known facts, ownership cautions and missing confirmations. |
| 22 | Conservative amenities | Exclude negated, nearby, shared and hypothetical features. |
| 23 | Verification evidence | Admin records source, quote, scope, actor and before/after values. Only an explicit price/availability check sets a date. |
| 24 | Missing dimensions | Prioritized admin queue; absent values are never guessed. Manual source work still required. |
| 25 | Tenure clarity | Leasehold/restricted ownership distinguished only when stated; otherwise unconfirmed. |
| 26 | Honest cost comparisons | Asking price separated from estimated purchase costs and renovation; same chosen rent across views. |
| 27 | Registration intent | Existing source-link gate, return URL, resend/edit-email flow retained and regression tested. |
| 28 | Registration diagnostics | Requested/failed/confirmed events plus admin database counts and separate provider delivery events. Analytics is consent-based. |
| 29 | Consistent interface language | Preserve the established English interface. Do not enable incomplete automatic translations. |
| 30 | Ranking transparency | Explain popularity vs valuation; distinguish sponsored/editorial placements and initial points. |
| 31 | Honest vote feedback | Human vote acknowledgement uses ballots rather than seeded points. |
| 32 | Regional precision | Scandinavia explicitly labelled as a region; do not invent an individual country. |
| 33 | Useful actions measured | Consented saves, votes, quick views, comparisons and original-listing opens. |
| 34 | Private account updates | Own-account notifications only; explicit mark-as-read. |
| 35 | Shared reading preferences | Rent/motion/comparison preferences sync across mounted components. |
| 36 | Responsive loading | Avoid loading the entire catalogue for suggestions or category artwork; prefetch bounded. |
| 37 | Honest sharing | Share text and story image include dated team check or unconfirmed availability. |
| 38 | Collaborative boards | Private member discussion, expiring invitations, revocation, removal and shared home edits. Board itself remains public, labelled explicitly. |
| 39 | Relevant alerts | Confirmed account + owned alert + explicit saved preferences; daily/weekly/off and new/price/availability choices; exclude viewed new homes. Future changes only, no historic blast. |
| 40 | Alert ownership | Anonymous requests cannot overwrite or claim another account's saved search; lock prevents concurrent duplicate creation. |

## Developer, administrator and release reliability

| # | Improvement | Implementation and limit |
|---|---|---|
| 41 | Prior-contact protection | Existing fingerprint/protection timestamps and commission snapshots retained; disputes display that evidence. |
| 42 | Sharing audit | Per-account history of preference changes from this release; old audit remains available. Sharing remains optional. |
| 43 | Safer lead import | Existing preview/deduplication retained; explicit warning for phones without an international prefix. |
| 44 | Explain matches | Country and budget comparison in introduction detail and overdue queue; unknowns remain unknown. |
| 45 | Follow-up queue | Overdue introductions with responsible recipient, due date and matching context. |
| 46 | Commission cases | Permission-checked case notes, owner, deadline and explained admin resolution. |
| 47 | Financial reconciliation | Partial collections, refunds, referral payments/returns, stable retry keys, caps and dispute blocks. Records real transactions; does not move money. |
| 48 | Admin quality queue | Missing photos/facts, stale verification, source checks and evidence history, ordered by priority. Source validity needs actual review; no automatic claim that every portal was checked. |
| 49 | Performance budget | Bounded fetch/preload, real image variants, existing device-separated p75 Web Vitals dashboard; entry JS budget 250 KB. Field metrics require traffic. |
| 50 | Release gates | Type checks, unit/integration tests, auth-email tests, database permission/finance/alert tests, build and bundle budget. Unit failures block CI again. |

## Verification

- Interface suite: 86 passing tests, including failed photo fallback, max-three comparison, filter preview, preserved return location, consistent rent, conservative amenities and quick-view photo restoration.
- New database suite: 10 passing tests covering admin/tenant isolation, evidence scope, alert ownership, private boards, sharing history, disputes, idempotent finance, opt-outs, confirmed accounts, suppression, viewed homes and delivery accounting.
- Build and app/node TypeScript checks pass. Production browser checks and GitHub Actions are recorded in the release response.
- No production seed data or test emails are inserted by these migrations. The alert scheduler processes only future events for opted-in confirmed accounts.

## Deployment / recovery

Apply the four `20260927` SQL migrations in order, then publish the GitHub commit. Changes are additive. Reverting the frontend commit leaves private operational history intact. To pause the new alert scheduler, disable the `rh-buyer-alerts` cron job; do not delete receipts, financial journal or case evidence. Keep legacy alert ownership protections when reverting a UI.
