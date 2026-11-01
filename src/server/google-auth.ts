import { importPKCS8, SignJWT } from 'jose';
import { z } from 'zod';
import type { CalendarCredentials } from '@/server/calendar-config';
import { failureCodeOf } from '@/server/fetch-error';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events.owned',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const TIMEOUT_MS = 5_000;
const LIFETIME_S = 3_600;
const REFRESH_MARGIN_MS = 300_000;
// An exchange older than its own timeout plus this is presumed hung (for example
// its request was cancelled), so a new caller starts a fresh one.
const STALE_MARGIN_MS = 2_000;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});
const errorSchema = z.object({ error: z.string() });

type Cached = { token: string; expiresAt: number };
const tokens = new Map<string, Cached>();
const keys = new Map<string, Promise<CryptoKey>>();
const inflight = new Map<
  string,
  { at: number; promise: Promise<TokenResult> }
>();
const failures = new Map<string, { at: number; code: string }>();

export type TokenResult =
  | { ok: true; token: string }
  | { ok: false; code: string };

type TokenRequest = {
  credentials: CalendarCredentials;
  tokenUrl: string;
  fetch: typeof fetch;
  now: number;
  failureTtlMs?: number;
};

function cacheKey({
  client_email,
  subject,
  private_key_id,
}: CalendarCredentials) {
  return `${client_email}|${subject}|${private_key_id}`;
}

export function signingKey(
  credentials: CalendarCredentials,
): Promise<CryptoKey> {
  // The key text is part of the cache key: a rotated or broken key must not
  // reuse the import of an earlier one that shares its id.
  const key = `${cacheKey(credentials)}|${credentials.private_key}`;
  let found = keys.get(key);
  if (found === undefined) {
    found = importPKCS8(credentials.private_key, 'RS256');
    keys.set(key, found);
    found.catch(() => keys.delete(key));
  }
  return found;
}

async function failureCode(response: Response): Promise<string> {
  try {
    const parsed = errorSchema.safeParse(await response.json());
    if (parsed.success) {
      const { error } = parsed.data;
      if (
        error === 'unauthorized_client' ||
        error === 'access_denied' ||
        error === 'invalid_grant'
      ) {
        return `auth_${error}`;
      }
    }
  } catch {
    // The status alone identifies the failure.
  }
  return `auth_http_${response.status}`;
}

async function exchange({
  credentials,
  tokenUrl,
  fetch: send,
  now,
}: TokenRequest): Promise<TokenResult> {
  let key: CryptoKey;
  try {
    key = await signingKey(credentials);
  } catch {
    return { ok: false, code: 'auth_key' };
  }
  try {
    const issued = Math.floor(now / 1000);
    const assertion = await new SignJWT({ scope: GOOGLE_SCOPES.join(' ') })
      .setProtectedHeader({
        alg: 'RS256',
        typ: 'JWT',
        kid: credentials.private_key_id,
      })
      .setIssuer(credentials.client_email)
      .setSubject(credentials.subject)
      .setAudience(tokenUrl)
      .setIssuedAt(issued)
      .setExpirationTime(issued + LIFETIME_S)
      .sign(key);
    const response = await send(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, code: await failureCode(response) };
    const parsed = tokenSchema.safeParse(await response.json());
    if (!parsed.success) return { ok: false, code: 'auth_response' };
    tokens.set(cacheKey(credentials), {
      token: parsed.data.access_token,
      expiresAt: now + parsed.data.expires_in * 1000,
    });
    return { ok: true, token: parsed.data.access_token };
  } catch (error) {
    return { ok: false, code: failureCodeOf(error) };
  }
}

// Cached for its lifetime, shared while in flight, and a failure is remembered
// for failureTtlMs so a broken Google does not cost every request a round trip.
export function accessToken(request: TokenRequest): Promise<TokenResult> {
  const id = cacheKey(request.credentials);
  const { now, failureTtlMs = 0 } = request;
  const cached = tokens.get(id);
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > now) {
    return Promise.resolve({ ok: true, token: cached.token });
  }
  const failed = failures.get(id);
  if (failed && now - failed.at < failureTtlMs) {
    return Promise.resolve({ ok: false, code: failed.code });
  }
  const pending = inflight.get(id);
  if (pending && now - pending.at < TIMEOUT_MS + STALE_MARGIN_MS) {
    return pending.promise;
  }
  const started = exchange(request).then((result) => {
    if (inflight.get(id)?.promise === started) inflight.delete(id);
    if (result.ok) failures.delete(id);
    else failures.set(id, { at: now, code: result.code });
    return result;
  });
  inflight.set(id, { at: now, promise: started });
  return started;
}

export function clearTokenCache(): void {
  tokens.clear();
  inflight.clear();
  failures.clear();
}
