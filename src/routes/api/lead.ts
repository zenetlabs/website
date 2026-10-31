import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/lead')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        (await import('@/server/lead-route')).postLead(request),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('POST'),
    },
  },
});
