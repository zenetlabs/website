import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/voice/session')({
  server: {
    handlers: {
      // The flag is read here so a dark build imports nothing of the voice
      // server code, writes nothing to D1 and never reads a secret.
      POST: async ({ request }) =>
        __VOICE__
          ? (await import('@/server/voice/route')).postVoiceSession(request)
          : (await import('@/server/responses')).jsonError('unavailable', 503),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('POST'),
    },
  },
});
