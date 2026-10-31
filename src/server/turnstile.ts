import { z } from 'zod';
import { isLiveHost, isPreviewHost } from '@/lib/redirects';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 10_000;

const siteverifySchema = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  hostname: z.string().optional(),
  metadata: z
    .object({ result_with_testing_key: z.boolean().optional() })
    .optional(),
});

function isTrustedHost(hostname: string | undefined): boolean {
  return (
    hostname !== undefined && (isLiveHost(hostname) || isPreviewHost(hostname))
  );
}

type TurnstileCheck = {
  token: string;
  action: string;
  secret: string;
  remoteIp: string | null;
  fetch: typeof fetch;
};

export async function verifyTurnstile({
  token,
  action,
  secret,
  remoteIp,
  fetch: send,
}: TurnstileCheck): Promise<boolean> {
  try {
    const response = await send(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const parsed = siteverifySchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.success) return false;
    const verdict = parsed.data;
    return (
      verdict.metadata?.result_with_testing_key === true ||
      (verdict.action === action && isTrustedHost(verdict.hostname))
    );
  } catch {
    return false;
  }
}
