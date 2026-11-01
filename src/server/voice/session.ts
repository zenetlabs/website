import type { Locale } from '@/lib/i18n';
import { isLiveHost } from '@/lib/redirects';
import type { VoiceError } from '@/lib/voice-client';
import { utcDay } from '@/server/chat/usage';
import type { Limiter } from '@/server/rate-limit';
import { gate, type Issue, verifyHuman } from '@/server/request';
import { errorName, jsonError, jsonOk } from '@/server/responses';
import { conversationToken } from '@/server/voice/elevenlabs';
import { voiceSessionRequest } from '@/server/voice/schema';
import { VOICE_SETTINGS } from '@/server/voice/settings';
import {
  claimVoiceSession,
  deleteVoiceSession,
  setConversationId,
} from '@/server/voice/store';
import type { SiteConfig } from '../../../site.config';

const MAX_BODY_BYTES = 4096;

export type VoiceDeps = {
  db: D1Database;
  fetch: typeof fetch;
  site: SiteConfig;
  apiOrigin: string;
  dailySessions: number;
  limiter: Limiter;
  apiKey: () => Promise<string | null>;
  toolSecret: () => Promise<string | null>;
  turnstileSecret: () => Promise<string>;
  now: () => number;
  waitUntil: (promise: Promise<unknown>) => void;
};

const STATUS = {
  origin: 403,
  unsupported: 415,
  rate: 429,
  'too-large': 413,
  invalid: 400,
  captcha: 403,
  budget: 503,
  unavailable: 503,
} as const satisfies Record<VoiceError, number>;

function reject(error: VoiceError, issues?: Issue[]): Response {
  return jsonError(error, STATUS[error], issues ? { issues } : {});
}

type Secrets = Promise<[string | null, string | null]>;

// The agent for a locale and the API key, once the tool secret is readable too
// (a call whose tools all answered 401 would be wasted minutes). A placeholder
// or a missing secret reads as null.
async function configuredFor(
  deps: VoiceDeps,
  locale: Locale,
  secrets: Secrets,
): Promise<{ agentId: string; apiKey: string } | null> {
  const agentId = deps.site.voice.agents[locale];
  if (agentId === null) return null;
  const [apiKey, toolSecret] = await secrets;
  return apiKey === null || toolSecret === null ? null : { agentId, apiKey };
}

export async function handleVoiceSession(
  request: Request,
  deps: VoiceDeps,
): Promise<Response> {
  if (!deps.site.voice.published) return reject('unavailable');
  // The gate reads the Turnstile secret as soon as the limiter passes, while the
  // upload is still arriving; our two secrets are read at that same moment.
  const reads: { pending?: Secrets } = {};
  const gated = await gate({
    request,
    schema: voiceSessionRequest,
    label: 'voice',
    limiter: deps.limiter,
    maxBytes: MAX_BODY_BYTES,
    secret: () => {
      reads.pending = Promise.all([deps.apiKey(), deps.toolSecret()]);
      return deps.turnstileSecret();
    },
  });
  if (gated.status === 'rejected') return reject(gated.error, gated.issues);
  const { input, ip, secret } = gated;

  const configured = await configuredFor(
    deps,
    input.locale,
    reads.pending ?? Promise.all([deps.apiKey(), deps.toolSecret()]),
  );
  if (configured === null) {
    console.error('voice: not configured', { locale: input.locale });
    return reject('unavailable');
  }

  const failure = await verifyHuman({
    token: input.turnstileToken,
    action: 'voice',
    label: 'voice',
    ip,
    secret,
    fetch: deps.fetch,
  });
  if (failure !== null) return reject(failure);

  const now = deps.now();
  const id = crypto.randomUUID();
  const isTest = !isLiveHost(new URL(request.url).hostname);
  let claimed: boolean;
  try {
    claimed = await claimVoiceSession(deps.db, {
      id,
      now,
      day: utcDay(now),
      locale: input.locale,
      timeZone: input.timeZone,
      startPage: input.page,
      isTest,
      cap: deps.dailySessions,
    });
  } catch (error) {
    console.error('voice: session not stored', { error: errorName(error) });
    return reject('unavailable');
  }
  if (!claimed) return reject('budget');

  const minted = await conversationToken({
    apiOrigin: deps.apiOrigin,
    apiKey: configured.apiKey,
    agentId: configured.agentId,
    fetch: deps.fetch,
  });
  if (!minted.ok) {
    console.error('voice: token failed', { code: minted.code });
    // The visitor gets the answer now; the day's slot is released behind it.
    deps.waitUntil(
      deleteVoiceSession(deps.db, id).catch((error) => {
        console.error('voice: release failed', { error: errorName(error) });
      }),
    );
    return reject('unavailable');
  }
  if (minted.conversationId !== null) {
    deps.waitUntil(
      setConversationId(deps.db, id, minted.conversationId).catch((error) => {
        console.error('voice: conversation id not stored', {
          error: errorName(error),
        });
      }),
    );
  }
  console.log('voice: session', { session: id, locale: input.locale, isTest });
  return jsonOk({
    token: minted.token,
    sessionId: id,
    maxSeconds: VOICE_SETTINGS.maxCallSeconds,
  });
}
