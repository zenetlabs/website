import type { GuardError } from '@/lib/guard-error';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';

export type VoiceError = GuardError | 'budget';

// Written out for the browser, which must not import the server module; the
// Record type fails to compile if a VoiceError is missing.
const VOICE_ERRORS: Record<VoiceError, true> = {
  origin: true,
  unsupported: true,
  rate: true,
  'too-large': true,
  invalid: true,
  captcha: true,
  budget: true,
  unavailable: true,
};

type MintBody = {
  locale: Locale;
  page: string;
  timeZone: string;
  turnstileToken: string;
};

type Minted = {
  token: string;
  sessionId: string;
  maxSeconds: number;
};

export type MintResult =
  | ({ ok: true } & Minted)
  | { ok: false; error: VoiceError };

const UNAVAILABLE: MintResult = { ok: false, error: 'unavailable' };

function isVoiceError(value: unknown): value is VoiceError {
  return typeof value === 'string' && Object.hasOwn(VOICE_ERRORS, value);
}

function parseMint(value: unknown): MintResult {
  if (!isRecord(value)) return UNAVAILABLE;
  if (value.ok === false) {
    return isVoiceError(value.error)
      ? { ok: false, error: value.error }
      : UNAVAILABLE;
  }
  const { token, sessionId, maxSeconds } = value;
  return value.ok === true &&
    typeof token === 'string' &&
    token !== '' &&
    typeof sessionId === 'string' &&
    typeof maxSeconds === 'number'
    ? { ok: true, token, sessionId, maxSeconds }
    : UNAVAILABLE;
}

export async function mintVoiceSession(
  body: MintBody,
  send: typeof fetch = fetch,
): Promise<MintResult> {
  try {
    const response = await send('/api/voice/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed: unknown = await response.json().catch(() => undefined);
    return parseMint(parsed);
  } catch {
    return UNAVAILABLE;
  }
}

// The name of the ElevenLabs dynamic variable that carries our session id. The
// `secret__` prefix keeps it out of the model's view; only tool headers use it.
export const VOICE_SESSION_VARIABLE = 'secret__zl_session';
