import { env, waitUntil } from 'cloudflare:workers';
import { handleLeadPost } from '@/server/lead';
import { outboxDeps } from '@/server/outbox';

export function postLead(request: Request): Promise<Response> {
  return handleLeadPost(request, {
    ...outboxDeps(env),
    limiter: env.LEAD_LIMITER,
    turnstileSecret: () => env.TURNSTILE_SECRET_KEY.get(),
    waitUntil,
    now: () => Date.now(),
  });
}
