import { createFileRoute } from '@tanstack/react-router';
import { SITE } from '@/lib/site';

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      // The flag is read here so a dark build never loads the chat chunk, which
      // carries the AI SDK. The handler checks it again.
      POST: async ({ request }) =>
        SITE.assistant.published
          ? (await import('@/server/chat/route')).postChat(request)
          : (await import('@/server/responses')).jsonError('unavailable', 503),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('POST'),
    },
  },
});
