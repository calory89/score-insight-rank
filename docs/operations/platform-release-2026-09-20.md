# Platform reliability release — 20 September 2026

Baseline production commit: `360353aad2600a8e7df96473ae9293305c57d328`.

## Implemented

- Server-enforced company isolation, restricted contact lookup, private introduction/contact access and protected commercial/approval fields.
- Audited introductions, profile and deal changes; frozen terms for new introductions; unique active introduction and sale constraints; idempotent sale retries and validated payment transitions.
- Confirmed saves and visible errors in promoter/CRM/admin actions. Transactional seller approval no longer marks unverified owner submissions as verified.
- CSV/TSV parsing with quoted and multiline fields, normalized deduplication, import issues, 250-row batches, fingerprint-only resumable checkpoints, complete safe CSV exports.
- Server pagination/search for uploaded contacts and shared introduction candidates; buyer search, due follow-ups and activity history.
- Operations dashboard, deduplicated contact-source directory and complete server counts; independent pagination for admin activity lists.
- Honest developer onboarding, preserved registration destination, fewer competing gates, consistent promotional prices and dated listing review status.
- Consent-based telemetry isolated from the legacy events table, short request deadlines and a circuit breaker. Deferred Web Vitals measurement and segmented p75 reporting.
- Type checks, behavior tests, email tests and a 250 KB entry-bundle budget in GitHub Actions.
- Resend outbox sender and signed delivery webhook source, provider IDs in auth logs, duplicate-confirmation fallback suppression and confirmation return destination support.

## Verification

Run `npm ci --legacy-peer-deps`, TypeScript checks, `npm test`, `node --test tests/auth-email.test.mjs`, `npm run build`, and `node scripts/check-bundle.mjs`.

`supabase/tests/platform_security.sql` is a transactional regression suite. It creates synthetic developer records, exercises role restrictions, contact disclosure, save transitions, commission calculations, duplicate sale handling, import deduplication and audit history. Run inside `BEGIN` and always `ROLLBACK`. Do not commit these fixtures. The rehearsal was rolled back and no fixture records remained.

The old, local-only `acquappesa.test.tsx` scratch test is not tracked upstream and is not part of this release.

## Deployment and recovery

Apply `supabase/migrations/20260920160000_platform_reliability.sql` atomically before publishing the frontend. The migration uses a 3-second lock timeout and does not delete customer data. New introduction terms are frozen prospectively; existing introductions retain their previous calculation behavior.

Publish the matching GitHub commit through the existing Lovable deployment operation. No Lovable AI chat or generation operation is required.

If the interface needs rollback, revert the release's UI commit in GitHub and publish a compatible fix. Do not blindly restore revoked permissions: old direct introduction writes were intentionally removed. Preserve schema additions, audit records, sales uniqueness and permission fixes; patch forward through the new RPCs.

Keep provider backup/PITR settings in the infrastructure account. A complete restore drill must use a separate database, compare row counts and representative records, and validate sign-in and company isolation before switching traffic. Transaction rollback rehearsals are not a replacement for a real backup restore. A full provider restore has not been performed in this release.

## Email activation checks

GitHub source publication is not proof of Edge Function deployment. Verify OPTIONS response headers before claiming activation: auth-email-hook must return `X-RealHunt-Auth-Version: resend-v2`; send-email must return `X-RealHunt-Mail-Version: resend-outbox-v2`. An unsigned POST to resend-delivery must return 401, not a missing-function 404.

Once the delivery endpoint is deployed, register a Resend webhook for delivered, bounced, complained, delivery_delayed, failed and suppressed. Store its signing secret only in `RESEND_WEBHOOK_SECRET` or server-only `app_secrets.resend_webhook_secret`. Never expose it in VITE variables or the repository. Webhook processing is signature-verified and idempotent. “Sent” remains provider acceptance; “delivered” requires a provider event.

## Measurement limits

Production p75 targets need real traffic and sufficient samples. Unit viewport checks are not physical-device certification. This release does not claim a 100/100 score, zero possible failures, verified property ownership or guaranteed email inbox placement.
