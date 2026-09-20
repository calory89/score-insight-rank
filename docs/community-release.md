# RealHunt community release

The home becomes a weekly property discovery leaderboard. The existing catalog remains at `/browse`; listing detail, country, account and search routes remain available. Old home links containing catalog search filters redirect to the catalog.

## Competition and identity

The inaugural edition is Sep 21–28, 2026, including Sep 20 launch activity, ending Sep 28 at 00:00 UTC. Subsequent editions run for seven days. Net score is upvotes minus downvotes; ties use upvotes, approval time, then deal ID. All approved deals can receive a new weekly ballot. Lifetime records retain one latest direction per visitor and deal rather than counting repeat weekly ballots as new people.

Visitors receive an opaque random token. SQL enforces one ballot per visitor/deal/week and one lifetime vote per visitor/deal. Repeats are idempotent; changing direction updates the ballot. Signing in merges the current anonymous ballot with the account's ballot without doubling the vote. Raw votes, identities, submitter IDs and profiles are not exposed through the public API.

Rate limits apply to issuing new sessions, voting, network volume, comments, reports and submissions. Anonymous uniqueness is browser based, so clearing storage or using another device can create another visitor; account merging and rate limits reduce abuse but do not guarantee one physical person. IP-derived keys are hashed with the existing private application secret. Winner snapshots close lazily on the first request after a week ends and cannot be overwritten by subsequent votes.

## Flows

- `/submit`: reuse existing catalog details by source URL; otherwise manual entry. Drafts survive sign-in. New submissions remain private pending review. This release does not use paid AI extraction.
- `/deal/:slug`: photos/video, original source, weekly voting, lifetime totals, deduplicated daily views, comments, saves and reports. Saves/comments/submission/reporting require the existing account login.
- `/hunt/mine`, `/hunt/saved`: submissions, review outcomes, hunter profile editing and saved discoveries. Approved hunters can share their discovery; voters receive a sharing prompt after a successful vote.
- `/hunter/:handle`: attributed discoveries and profile.
- `/hunt/admin`: role-based review, editing, approval/rejection/duplicates, reports, comment hiding and editorial Picks. Picks are independent of community ranking.
- `/winners`: permanent top-ten snapshots for closed editions.
- Weekly, all-time, country and category navigation. No Today view.

## Deployment

Apply `supabase/migrations/20260920223000_community_release.sql` to the existing project before activating the new frontend. It builds on the existing community schema migrations, retires unfinished write paths and adds the authoritative RPC. Review/apply it through an authorized SQL deployment connection. Do not invoke Lovable chat, its building agent, AI fixes or generation.

Use the existing GitHub integration to synchronize tested source to Lovable, then use only the publication control. Until the SQL migration is applied and live flows verified, keep the release in a review branch and leave the published site unchanged.

## Verification

Run `npm ci --legacy-peer-deps`, both TypeScript checks from the quality workflow, `npm test`, `node --test tests/auth-email.test.mjs tests/community-db.test.mjs`, `npm run build`, and `node scripts/check-bundle.mjs`.

The database tests use local PostgreSQL through PGlite with pgcrypto and synthetic fixture data; they do not connect to production. They cover deduplication, reversal, account merge, approval boundaries, attribution, authenticated saves/comments, views, moderation, raw-table permissions and immutable weekly snapshots. UI tests cover vote success/failure, save login, filters and submission draft retention. Production authentication and publication still require live smoke testing after deployment.
