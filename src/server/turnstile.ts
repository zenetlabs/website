import { z } from 'zod';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 10_000;
// A token lives 300 s; a clock a little ahead of ours is tolerated.
const MAX_AGE_MS = 300_000;
const MAX_SKEW_MS = 30_000;

const siteverifySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  hostname: z.string().optional(),
  challenge_ts: z.string().optional(),
  'error-codes': z.array(z.string()).optional(),
  metadata: z
    .object({ result_with_testing_key: z.boolean().optional() })
    .optional(),
});

type Verdict = z.infer<typeof siteverifySchema>;

export type TurnstileRejection =
  | 'action'
  | 'hostname'
  | 'age'
  | 'duplicate'
  | 'invalid'
  | 'network';

export type TurnstileCheck = {
  token: string;
  // The action the widget of this surface was rendered with.
  action: string;
  // The request's own hostname: the widget ran on the page that posted.
  hostname: string;
  secret: string;
  remoteIp: string | null;
  fetch: typeof fetch;
  now: number;
  // Cloudflare's testing keys pass only where the config allows them.
  testingKeys: boolean;
};

type Answer = { verdict: Verdict } | { retry: boolean };

async function siteverify(
  send: typeof fetch,
  body: Record<string, string>,
): Promise<Answer> {
  try {
    const response = await send(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 500) return { retry: true };
    if (!response.ok) return { retry: false };
    const reply: unknown = await response.json().catch(() => undefined);
    const parsed = siteverifySchema.safeParse(reply);
    if (!parsed.success) return { retry: false };
    if (parsed.data['error-codes']?.includes('internal-error')) {
      return { retry: true };
    }
    return { verdict: parsed.data };
  } catch {
    return { retry: true };
  }
}

function judge(
  verdict: Verdict,
  check: TurnstileCheck,
): TurnstileRejection | null {
  if (!verdict.success) {
    return verdict['error-codes']?.includes('timeout-or-duplicate')
      ? 'duplicate'
      : 'invalid';
  }
  if (verdict.metadata?.result_with_testing_key === true) {
    return check.testingKeys ? null : 'invalid';
  }
  if (verdict.action !== check.action) return 'action';
  if (verdict.hostname !== check.hostname) return 'hostname';
  const issued = Date.parse(verdict.challenge_ts ?? '');
  if (Number.isNaN(issued)) return 'age';
  const age = check.now - issued;
  if (age > MAX_AGE_MS || age < -MAX_SKEW_MS) return 'age';
  return null;
}

// One Siteverify call per token, retried once with the same idempotency key on
// a network error, a 5xx or internal-error (Cloudflare's documented pattern).
// Null when the token passes; the reason otherwise. The token is never logged.
export async function verifyTurnstile(
  check: TurnstileCheck,
): Promise<TurnstileRejection | null> {
  const body = {
    secret: check.secret,
    response: check.token,
    idempotency_key: crypto.randomUUID(),
    ...(check.remoteIp ? { remoteip: check.remoteIp } : {}),
  };
  let answer = await siteverify(check.fetch, body);
  if ('retry' in answer && answer.retry) {
    answer = await siteverify(check.fetch, body);
  }
  const reason =
    'verdict' in answer
      ? judge(answer.verdict, check)
      : answer.retry
        ? 'network'
        : 'invalid';
  if (reason !== null) console.warn('turnstile: rejected', { reason });
  return reason;
}
