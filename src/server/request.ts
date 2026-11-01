import type { z } from 'zod';
import type { GuardError } from '@/lib/guard-error';
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

export type BrowserPost<T> =
  | { status: 'ok'; input: T; ip: string | null }
  | { status: 'honeypot'; input: T }
  | { status: 'rejected'; error: GuardError; issues?: Issue[] };

type Guarded = { website: string; turnstileToken: string };

type GateOptions<T> = {
  request: Request;
  schema: z.ZodType<T>;
  label: string;
  limiter: Limiter;
  maxBytes: number;
  // Read from the moment the limiter passes, so it overlaps with the upload.
  secret?: () => Promise<string>;
};

type Gated<T> =
  | { status: 'ok'; input: T; ip: string | null; secret: Secret }
  | { status: 'rejected'; error: GuardError; issues?: Issue[] };

function rejected(
  error: GuardError,
  issues?: Issue[],
): { status: 'rejected'; error: GuardError; issues?: Issue[] } {
  return { status: 'rejected', error, ...(issues ? { issues } : {}) };
}

// The part every public browser POST shares: same origin, JSON, per-IP limit,
// capped body, schema.
export async function gate<T>({
  request,
  schema,
  label,
  limiter,
  maxBytes,
  secret,
}: GateOptions<T>): Promise<Gated<T>> {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return rejected('origin');
  }
  if (!isJsonRequest(request)) return rejected('unsupported');
  const ip = request.headers.get('cf-connecting-ip');
  if (await isLimited(limiter, ip ?? 'unknown', label)) return rejected('rate');
  const warmed = secret ? readSecret(secret) : Promise.resolve(null);
  const text = await readCapped(request, maxBytes);
  if (text === null) return rejected('too-large');
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success) return rejected('invalid', issuesOf(parsed.error));
  return { status: 'ok', input: parsed.data, ip, secret: warmed };
}

type Secret = Promise<{ value: string } | null>;

export async function readSecret(read: () => Promise<string>): Secret {
  try {
    return { value: await read() };
  } catch {
    return null;
  }
}

// The Turnstile check for one action: 'unavailable' when the secret cannot be
// read, 'captcha' when the token fails, null when it passes.
export async function verifyHuman({
  token,
  action,
  label,
  ip,
  secret,
  fetch: send,
}: {
  token: string;
  action: string;
  label: string;
  ip: string | null;
  secret: Secret;
  fetch: typeof fetch;
}): Promise<'unavailable' | 'captcha' | null> {
  const resolved = await secret;
  if (resolved === null) {
    console.error(`${label}: secret unavailable`);
    return 'unavailable';
  }
  const human = await verifyTurnstile({
    token,
    action,
    secret: resolved.value,
    remoteIp: ip,
    fetch: send,
  });
  return human ? null : 'captcha';
}

type GuardOptions<T extends Guarded> = Omit<GateOptions<T>, 'secret'> & {
  action: string;
  turnstileSecret: () => Promise<string>;
  fetch: typeof fetch;
};

// The shared gate for every public browser POST: the gate, the honeypot, then
// the Turnstile check for one action.
export async function guardBrowserPost<T extends Guarded>({
  action,
  turnstileSecret,
  fetch: send,
  ...options
}: GuardOptions<T>): Promise<BrowserPost<T>> {
  const gated = await gate({ ...options, secret: turnstileSecret });
  if (gated.status === 'rejected') return gated;
  const { input, ip, secret } = gated;
  if (input.website !== '') return { status: 'honeypot', input };
  const failure = await verifyHuman({
    token: input.turnstileToken,
    action,
    label: options.label,
    ip,
    secret,
    fetch: send,
  });
  return failure === null ? { status: 'ok', input, ip } : rejected(failure);
}
