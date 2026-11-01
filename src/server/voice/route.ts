import { env, waitUntil } from 'cloudflare:workers';
import { SITE } from '@/lib/site';
import { readSecret } from '@/server/calendar-config';
import { handleVoiceSession } from '@/server/voice/session';

export function postVoiceSession(request: Request): Promise<Response> {
  return handleVoiceSession(request, {
    db: env.DB,
    fetch: globalThis.fetch.bind(globalThis),
    site: SITE,
    apiOrigin: __SERVER__.voice.apiOrigin,
    dailySessions: __SERVER__.voice.dailySessions,
    limiter: env.VOICE_LIMITER,
    apiKey: () => readSecret(env.ELEVENLABS_API_KEY),
    toolSecret: () => readSecret(env.TOOLS_BEARER_SECRET),
    turnstileSecret: () => env.TURNSTILE_SECRET_KEY.get(),
    now: () => Date.now(),
    waitUntil,
  });
}
