import type { z } from 'zod';
import { isLimited, type Limiter } from '@/server/rate-limit';
import { verifyTurnstile } from '@/server/turnstile';

const JSON_TYPE = /^application\/json(?:\s*;|$)/i;
const MAX_ISSUES = 10;

export type Issue = { path: string; message: string };

export function issuesOf(error: z.ZodError): Issue[] {
  return error.issues.slice(0, MAX_ISSUES).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function isJsonRequest(request: Request): boolean {
  return JSON_TYPE.test(request.headers.get('content-type') ?? '');
}

export async function readCapped(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export type GuardError =
  | 'origin'
  | 'unsupported'
  | 'rate'
  | 'too-large'
  | 'invalid'
  | 'captcha'
  | 'unavailable';

export type BrowserPost<T> =
  | { status: 'ok'; input: T; ip: string | null }
  | { status: 'honeypot'; input: T }
  | { status: 'rejected'; error: GuardError; issues?: Issue[] };

type Guarded = { website: string; turnstileToken: string };

type GuardOptions<T extends Guarded> = {
  request: Request;
  schema: z.ZodType<T>;
  action: string;
  label: string;
  limiter: Limiter;
  maxBytes: number;
  turnstileSecret: () => Promise<string>;
  fetch: typeof fetch;
};

function rejected(error: GuardError, issues?: Issue[]): BrowserPost<never> {
  return { status: 'rejected', error, ...(issues ? { issues } : {}) };
}

// The shared gate for every public browser POST: same origin, JSON, per-IP limit,
// capped body, schema, honeypot, then the Turnstile check for one action.
export async function guardBrowserPost<T extends Guarded>({
  request,
  schema,
  action,
  label,
  limiter,
  maxBytes,
  turnstileSecret,
  fetch: send,
}: GuardOptions<T>): Promise<BrowserPost<T>> {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return rejected('origin');
  }
  if (!isJsonRequest(request)) return rejected('unsupported');
  const ip = request.headers.get('cf-connecting-ip');
  if (await isLimited(limiter, ip ?? 'unknown', label)) return rejected('rate');
  const secret = readSecret(turnstileSecret);
  const text = await readCapped(request, maxBytes);
  if (text === null) return rejected('too-large');
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success) return rejected('invalid', issuesOf(parsed.error));
  if (parsed.data.website !== '') {
    return { status: 'honeypot', input: parsed.data };
  }
  const resolved = await secret;
  if (resolved === null) {
    console.error(`${label}: secret unavailable`);
    return rejected('unavailable');
  }
  const human = await verifyTurnstile({
    token: parsed.data.turnstileToken,
    action,
    secret: resolved.value,
    remoteIp: ip,
    fetch: send,
  });
  return human ? { status: 'ok', input: parsed.data, ip } : rejected('captcha');
}

async function readSecret(
  read: () => Promise<string>,
): Promise<{ value: string } | null> {
  try {
    return { value: await read() };
  } catch {
    return null;
  }
}
