# RealHunt network workflows

This release focuses on the referral network, not a generic property-management CRM. It uses GitHub, SQL migrations and ordinary website publication; no Lovable AI chat/generation call is required.

## Developer workflows

- Independent receiving preference. Toggling receiving does not change sharing defaults or any contact's sharing state. Existing developers retain their prior receiving mode; new developers opt in explicitly.
- Protected/private/shared contact terminology, precise registration timestamps, explicit page-level sharing confirmation and audited sharing changes. Bulk uploads remain fingerprints only.
- Immutable prior-contact evidence on introductions, retained after contact removal. Uploads after the first introduction do not create a retrospective exemption. Withdrawing sharing stops future introductions while existing rights/obligations remain.
- Commission terms and origin visible before acceptance. Sale previews use the actual introduction rate, not a hardcoded default.
- A source developer can supply an individual contact after recipient acceptance, confirming permission. The server verifies ownership, current sharing and that email/phone matches the original fingerprint. The recipient receives details through the existing scoped overview; the source does not gain access to recipient notes.
- My day queues, private dated tasks, buyer stage/origin/exemption filters and complete payable/referral statement exports.
- Seller collection is distinguished from referral payout; collected commissions are not labeled as already paid to the source.

## Administration

- Common workspace navigation between Network CRM, Operations, All contacts and Site & support.
- Work queues for review, acceptance, missing contacts, follow-ups, collection and payout.
- Searchable company/intro/deal sections, developer relationship profiles and an audit viewer.
- Paged candidates for both shared developer contacts and existing RealHunt buyers.
- Preflight preview verifies receiver approval, signature and receiving preference; source availability, duplicate introduction, prior-contact exemption and commission split. Commit revalidates the reviewed payload while locking the relevant rows.
- Admin contact handoff requires permission evidence and a fingerprint match. The legacy contact-write RPC is no longer callable by browser sessions.
- Explicit confirmation for commercial-rate changes, payment/void states and source payouts. Marking a referral paid remains blocked until the seller commission is collected.

## Verification and rollout

Migration: `20260920200000_network_workflows.sql`. Apply atomically, record it in the migration ledger, then publish the matching frontend. The backend changes are backward compatible except the deliberately replaced direct-sharing/contact-write paths; old cached admin/developer pages must reload.

Transactional SQL tests: `platform_security.sql` plus `network_workflows.sql`. Cover company isolation, contact permissions/matching, independent preferences, sharing withdrawal, protected-contact deletion, later uploads, duplicate/stale introductions, fixed commission terms, source allocation, task isolation and public access. All test fixtures are rolled back.

UI/logic: 47 tests pass, including eight network workflow tests. Existing email tests: 10 pass. TypeScript and production build pass. Entry bundle: 199,545 bytes, within the existing 250,000-byte budget.

Prior-contact backfill uses existing timestamped fingerprints. It does not reconstruct proof that was already deleted before this release. Existing recorded sales remain unchanged. Contact matching is per normalized email/phone fingerprint, not a claim that different identifiers have been resolved to the same human.

This release does not add bank transfers, invoicing automation, team assignment, bulk email campaigns or new paid integrations. The separately documented Edge Function/email-delivery activation remains outside this release; these workflows do not depend on it. Real users must still provide genuine contact-sharing authority and truthful sales/payment information.
