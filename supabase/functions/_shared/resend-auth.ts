type AuthEmail = {
  runId: string;
  actionType: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  category?: "auth" | "transactional";
  replyTo?: string;
  headers?: Record<string, string>;
};

export class ResendDeliveryError extends Error {
  constructor(public status: number, public retryable: boolean, message: string) {
    super(message);
  }
}

// Server-only: credentials must be stored in Edge Function secrets, never VITE_*.
export async function sendAuthEmail(
  email: AuthEmail,
  config: { apiKey?: string; from?: string },
  request: typeof fetch = fetch,
): Promise<string> {
  if (!config.apiKey || !config.from) {
    throw new ResendDeliveryError(503, true, 'Resend configuration is incomplete');
  }
  // Email-change events can share a run ID but have different recipients.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
    JSON.stringify([email.runId, email.actionType, email.to.toLowerCase()]),
  ));
  const key = 'auth-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  let response: Response;
  try {
    response = await request('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        from: config.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
        tags: [{ name: 'category', value: email.category || 'auth' }, { name: 'action', value: email.actionType }],
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ResendDeliveryError(503, true, 'Resend is temporarily unavailable');
  }
  if (!response.ok) {
    // Never store provider response bodies: they may contain addresses or tokens.
    throw new ResendDeliveryError(response.status,
      response.status === 429 || response.status === 408 || response.status >= 500,
      `Resend rejected the email (HTTP ${response.status})`);
  }
  const result = await response.json().catch(() => null);
  if (!result || typeof result.id !== 'string' || !result.id) {
    throw new ResendDeliveryError(502, true, 'Resend did not acknowledge the email');
  }
  return result.id;
}
