import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const helper = compile(readFileSync(new URL('../supabase/functions/_shared/resend-auth.ts', import.meta.url), 'utf8'));
const { sendAuthEmail, ResendDeliveryError } = await import('data:text/javascript;base64,' + Buffer.from(helper).toString('base64'));
const email = { runId: 'event-1', actionType: 'signup', to: 'person@example.test', subject: 'Confirm', html: '<a href="https://example.test/verify">Confirm</a>', text: 'Confirm' };
const config = { apiKey: 'test-key', from: 'RealHunt <noreply@example.test>' };

test('sends the original confirmation email through Resend and keeps retry keys stable', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 'email-1' });
  };
  assert.equal(await sendAuthEmail(email, config, request), 'email-1');
  await sendAuthEmail(email, config, request);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].options.headers['Idempotency-Key'], calls[1].options.headers['Idempotency-Key']);
  assert.equal(JSON.parse(calls[0].options.body).html, email.html);
  assert.deepEqual(JSON.parse(calls[0].options.body).to, [email.to]);
  await sendAuthEmail({ ...email, to: 'new@example.test' }, config, request);
  assert.notEqual(calls[0].options.headers['Idempotency-Key'], calls[2].options.headers['Idempotency-Key']);
});

test('missing credentials never attempt delivery', async () => {
  await assert.rejects(sendAuthEmail(email, {}, async () => assert.fail('must not send')), /configuration is incomplete/);
});

for (const [status, retryable] of [[429, true], [500, true], [403, false], [422, false]]) {
  test(`provider HTTP ${status} is not reported as sent`, async () => {
    await assert.rejects(sendAuthEmail(email, config, async () => Response.json({ error: 'private provider details' }, { status })), error => {
      assert.equal(error.retryable, retryable);
      assert.equal(error.status, status);
      assert.ok(!error.message.includes('private'));
      return true;
    });
  });
}

test('network failure and unacknowledged responses can be retried', async () => {
  await assert.rejects(sendAuthEmail(email, config, async () => { throw new Error('network'); }), error => error.retryable);
  await assert.rejects(sendAuthEmail(email, config, async () => Response.json({})), error => error.retryable);
});

function hook({ invalidSignature = false, sendError, logError = false } = {}) {
  const state = { sends: [], logs: [], handler: null };
  class WebhookError extends Error { code = 'invalid_signature'; }
  const context = {
    Request, Response, URL,
    console: { log() {}, error() {} },
    React: { createElement: (_template, props) => props },
    renderAsync: async () => '<p>Confirmation link</p>',
    parseEmailWebhookPayload() {}, WebhookError, ResendDeliveryError,
    verifyWebhookRequest: async () => {
      if (invalidSignature) throw new WebhookError('invalid');
      return { payload: { version: '1', run_id: email.runId, data: { action_type: 'signup', email: email.to, url: 'https://example.test/verify' } } };
    },
    sendAuthEmail: async data => { state.sends.push(data); if (sendError) throw sendError; return 'email-1'; },
    createClient: () => ({ from: () => ({ insert: async data => { state.logs.push(data); if (logError) throw new Error('log unavailable'); return { error: null }; } }) }),
    Deno: { env: { get: () => 'test-only' }, serve: handler => { state.handler = handler; } },
  };
  for (const name of ['SignupEmail', 'InviteEmail', 'MagicLinkEmail', 'RecoveryEmail', 'EmailChangeEmail', 'ReauthenticationEmail']) context[name] = () => null;
  const source = readFileSync(new URL('../supabase/functions/auth-email-hook/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/gm, '');
  vm.runInNewContext(compile(source), context);
  return state;
}

test('unsigned hooks cannot send emails', async () => {
  const state = hook({ invalidSignature: true });
  const response = await state.handler(new Request('https://example.test/hook', { method: 'POST' }));
  assert.equal(response.status, 401);
  assert.equal(state.sends.length, 0);
});

test('successful delivery is logged and survives a logging outage', async () => {
  for (const logError of [false, true]) {
    const state = hook({ logError });
    const response = await state.handler(new Request('https://example.test/hook', { method: 'POST' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).sent, true);
    assert.equal(state.sends.length, 1);
    assert.equal(state.logs[0].status, 'sent');
  }
});

test('hook returns a retryable error instead of false success when Resend fails', async () => {
  const state = hook({ sendError: new ResendDeliveryError(429, true, 'Rate limited') });
  const response = await state.handler(new Request('https://example.test/hook', { method: 'POST' }));
  assert.equal(response.status, 500);
  assert.equal(state.logs[0].status, 'failed');
  assert.equal((await response.json()).sent, undefined);
});
