import { env } from 'cloudflare:workers';
import { handleChatPost } from '@/server/chat/handler';
import { chatModel } from '@/server/chat/model';
import { bookingDeps } from '@/server/tool-deps';

export function postChat(request: Request): Promise<Response> {
  return handleChatPost(request, {
    ...bookingDeps(),
    limiter: env.CHAT_LIMITER,
    turnstileSecret: () => env.TURNSTILE_SECRET_KEY.get(),
    now: () => Date.now(),
    model: (sessionId) => chatModel(env.AI, __SERVER__.assistant, sessionId),
  });
}
