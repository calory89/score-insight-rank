# RealHunt community release

The home becomes a weekly property discovery leaderboard. The existing catalog remains at `/browse`; listing detail, country, account and search routes remain available. Old home links containing catalog search filters redirect to the catalog.

## Competition and identity

The inaugural edition is Sep 21–28, 2026, including Sep 20 launch activity, ending Sep 28 at 00:00 UTC. Subsequent editions run for seven days. Ranking uses positive votes only. Negative votes are rejected. Ties use the two launch homes, approval time, then deal ID. All approved deals can receive a new weekly ballot. All Time and total votes accumulate accepted weekly ballots across editions. They count votes, not unique people. This Week resets each edition while the total remains.

Visitors receive an opaque random token. SQL enforces one ballot per visitor/deal/week with repeat attempts idempotent. Signing in merges the current anonymous ballot with the account's ballot without doubling the vote. Raw votes, identities, submitter IDs and profiles are not exposed through the public API.

Rate limits apply to issuing new sessions, voting, network volume, comments, reports and submissions. Anonymous uniqueness is browser based, so clearing storage or using another device can create another visitor; account merging and rate limits reduce abuse but do not guarantee one physical person. IP-derived keys are hashed with the existing private application secret. Winner snapshots close lazily on the first request after a week ends and cannot be overwritten by subsequent votes.

## Flows

- `/submit`: reuse existing catalog details by source URL; otherwise manual entry. Drafts survive sign-in. New submissions remain private pending review. This release does not use paid AI extraction.
- `/deal/:slug`: photos/video, original source, weekly voting, lifetime totals, deduplicated daily views, comments, saves and reports. Saves/comments/submission/reporting require the existing account login.
- `/hunt/mine`, `/hunt/saved`: submissions, review outcomes, hunter profile editing and saved discoveries. Approved hunters can share their discovery; voters receive a sharing prompt after a successful vote.
- `/hunter/:handle`: attributed discoveries and profile.
- `/hunt/admin`: role-based review, editing, approval/rejection/duplicates, reports, comment hiding and editorial Picks. Picks are independent of community ranking.
- `/winners`: permanent top-ten snapshots for closed editions.
- Only This Week and All Time appear on the home. Country/category filters and the Past winners link are hidden for launch. No Today view.

## Deployment

Apply `supabase/migrations/20260920223000_community_release.sql` to the existing project before activating the new frontend. It builds on the existing community schema migrations, retires unfinished write paths and adds the authoritative RPC. Review/apply it through an authorized SQL deployment connection. Do not invoke Lovable chat, its building agent, AI fixes or generation.

Use the existing GitHub integration to synchronize tested source to Lovable, then use only the publication control. Until the SQL migration is applied and live flows verified, keep the release in a review branch and leave the published site unchanged.

## Verification

Run `npm ci --legacy-peer-deps`, both TypeScript checks from the quality workflow, `npm test`, `node --test tests/auth-email.test.mjs tests/community-db.test.mjs`, `npm run build`, and `node scripts/check-bundle.mjs`.

The database tests use local PostgreSQL through PGlite with pgcrypto and synthetic fixture data; they do not connect to production. They cover deduplication, negative-vote rejection, account merge, approval boundaries, attribution, authenticated saves/comments, views, moderation, raw-table permissions and immutable weekly snapshots. UI tests cover vote success/failure, save login, week/all-time totals and submission draft retention. Production authentication and publication still require live smoke testing after deployment.

### Brand and launch placement
Use the existing RealHunt roof logo, Fraunces wordmark and shared brand palette. With equal net scores and upvote counts, Umbria (€35,000) and Acquappesa (€39,000) lead in that order; genuine votes take precedence. The same tie-break applies to closed weekly winners. An explicitly labelled Eco Beach City sponsored card occupies the third unfiltered feed position, outside vote ranks and counters. No votes are seeded for promotion.

### Complete catalog and original-listing registration
Import every eligible visible catalog listing, including listings without a published price (no placeholder price text). Keep the complete feed accessible in pages of 24 with an explicit showing/total counter. Sponsored placement remains separate from catalog totals.

Original-listing actions require an authenticated account across community details, Lake Como and legacy deal cards. The community cards omit the source action; visitors open the property detail first. Anonymous actions show free registration with existing-account sign-in; they do not render outbound anchors. Community rankings, Picks and detail responses omit source URLs for anonymous requests, including details outside the first 100 rankings. Refresh source availability after sign-in/sign-out. Existing find-detail pages retain their account gate.

### Home submissions and account verification
Remove the two retired hero copy blocks. The home now accepts a property URL; Send property opens free registration for anonymous visitors. The return URL preserves the listing across email confirmation; the signed-in user explicitly confirms submission. `/submit` uses the same short flow, with the original detailed form available via “Add full property details instead”.

`quick_submit` derives identity and attribution on the server, imports known source data where available, and stores unknown links privately as pending. It checks duplicate canonical URLs, enforces a honeypot and shared account/network submission limits, and cannot self-approve. Admins receive an in-app pending count, refreshed every minute while visible and on focus. The review queue supports title/country/location/price/photo edits and rejection feedback; incomplete submissions cannot be approved. My submissions shows totals, status, source, dates, review notes and actual engagement after approval. No generated votes are added.

Authentication checks cover password success/failure, email confirmation destinations and cooldown, provider failure, first-password setup, expired links and return URL safety. The live auth settings allow signup and email access and require email confirmation. A browser negative-login test reached the real auth service and displayed the expected invalid-credentials error. A real successful login and email delivery still require a user-provided test address; mocked success tests are not proof of live email delivery.

### Initial points and live voting
The launch migration `20260921010000_launch_points.sql` stores a one-time editorial allocation separately from actual visitor ballots. The first entries receive 370, 328, 124 and 67 points; the long tail rapidly reaches zero. Cards label initial points, while every visitor vote is persisted through the real rate-limited API. Existing `?demo=1` links no longer disable voting or substitute synthetic data. This Week includes launch points only in the inaugural week; All Time retains them. Total votes always counts real visitor ballots. New submissions receive no initial points. Historic snapshots preserve their initial component separately.

The footer winner link and obsolete vote-direction text are removed. Email delivery/login verification still needs a user-provided test address. Admin notifications currently use the in-app review queue; unknown external listing data still requires manual completion rather than claiming universal extraction.
