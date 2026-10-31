import { z } from 'zod';

const TIMEOUT_MS = 10_000;
const ERROR_CODE = /^[a-z_]{1,64}$/;

const sentSchema = z.object({ id: z.string().min(1).max(128) });
const errorSchema = z.object({ name: z.string() });

export type OutgoingEmail = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
};

type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; throttled: boolean };

type SendRequest = {
  apiKey: string;
  baseUrl: string;
  idempotencyKey: string;
  message: OutgoingEmail;
  fetch: typeof fetch;
};

async function errorName(response: Response): Promise<string> {
  try {
    const parsed = errorSchema.safeParse(await response.json());
    return parsed.success && ERROR_CODE.test(parsed.data.name)
      ? parsed.data.name
      : 'unknown';
  } catch {
    return 'unknown';
  }
}

async function sentId(response: Response): Promise<string | null> {
  try {
    const parsed = sentSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.id : null;
  } catch {
    return null;
  }
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

export async function sendEmail({
  apiKey,
  baseUrl,
  idempotencyKey,
  message,
  fetch: send,
}: SendRequest): Promise<SendResult> {
  let response: Response;
  try {
    response = await send(`${baseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        reply_to: [message.replyTo],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      error: isTimeout(error) ? 'timeout' : 'network',
      throttled: false,
    };
  }
  if (response.ok) return { ok: true, id: await sentId(response) };
  const name = await errorName(response);
  return {
    ok: false,
    error: `resend ${response.status} ${name}`,
    throttled: response.status === 429,
  };
}
