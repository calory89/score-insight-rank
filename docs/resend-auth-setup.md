# Restore authentication emails using Resend

## Incident

The deployed `auth-email-hook` calls `enqueue_email`, but that RPC and its
dispatcher are absent. `email_send_log` records `Failed to enqueue email`.
The older `rh_auth_confirm_mail` trigger was neutralized during a database
performance incident. Keep that trigger inactive: restoring its table scans
would reintroduce the earlier database load and could send duplicate links.

## Change

The existing signature-verified hook now sends its rendered authentication
email directly to Resend, without the Lovable email delivery API or a database
queue. Supabase continues to generate and validate the original confirmation
links. Email verification remains enabled. Signup, login, recovery, invitation,
email change, and reauthentication templates retain their existing content.

The Resend idempotency key is stable per event, action and recipient. Resend
retains idempotency keys for 24 hours. Transient failures return a retryable
response to the hook caller. A provider acknowledgement is logged as `sent`;
this means accepted by Resend, not confirmed delivery to the recipient's inbox.
Logging failures cannot invalidate a successful send.

## Activation prerequisites

1. In Resend, verify the sending domain and choose an address belonging to it.
2. In this project's Cloud secrets, configure:
   - `RESEND_API_KEY`: a Resend key permitted to send from that domain.
   - `RESEND_FROM_EMAIL`: the complete verified sender, for example
     `RealHunt <noreply@realhunt.co>` **only if realhunt.co is verified in Resend**.
3. Keep `LOVABLE_API_KEY` in place. It verifies the existing incoming webhook
   signature; it is not used to send the email through Lovable.
4. Deploy the changed `auth-email-hook` Edge Function and its shared helper.
   A frontend-only publication is not proof that the Edge Function was deployed.
   Its OPTIONS response includes `X-RealHunt-Auth-Version: resend-v1` after activation.
5. Test one registration with an explicitly authorized test mailbox. Check
   Resend's delivery status, receive the link, choose a password, then sign in.
   Do not resend the historic failed backlog: old links may have expired or
   been superseded. Affected users should request a fresh confirmation link.

Never put either secret in GitHub source, browser code, or a `VITE_*` variable.
A GitHub sign-in connection does not make Resend credentials available to the
Edge Function. Configure secrets before activating this version. Resend has
its own plan quotas; this change does not make sending unlimited.

## Verification

Run `node --test tests/auth-email.test.mjs` from the repository root.
The tests mock the provider: they do not send email or confirm live delivery.

References:
- https://resend.com/docs/api-reference/emails/send-email
- https://resend.com/docs/dashboard/emails/idempotency-keys
