import { z } from 'zod';

const TIMEOUT_MS = 5000;

const tokenResponse = z.object({
  token: z.string().min(1).max(4096),
  conversation_id: z.string().max(128).optional(),
});

type TokenFailure =
  | 'auth'
  | 'agent'
  | 'invalid'
  | 'quota'
  | 'response'
  | 'network'
  | 'timeout'
  | `http_${number}`;

type TokenResult =
  | { ok: true; token: string; conversationId: string | null }
  | { ok: false; code: TokenFailure };

function failureOf(status: number): TokenFailure {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'agent';
  if (status === 422) return 'invalid';
  if (status === 429) return 'quota';
  return `http_${status}`;
}

// A WebRTC conversation token for one agent. The key, the token and the agent
// never reach a log: a failure is reported as a code.
export async function conversationToken({
  apiOrigin,
  apiKey,
  agentId,
  fetch: send,
}: {
  apiOrigin: string;
  apiKey: string;
  agentId: string;
  fetch: typeof fetch;
}): Promise<TokenResult> {
  const url = `${apiOrigin}/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;
  let response: Response;
  try {
    response = await send(url, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return { ok: false, code: timedOut ? 'timeout' : 'network' };
  }
  if (!response.ok) return { ok: false, code: failureOf(response.status) };
  const parsed = tokenResponse.safeParse(
    await response.json().catch(() => undefined),
  );
  return parsed.success
    ? {
        ok: true,
        token: parsed.data.token,
        conversationId: parsed.data.conversation_id ?? null,
      }
    : { ok: false, code: 'response' };
}
