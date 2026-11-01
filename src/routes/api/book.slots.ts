import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/book/slots')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import('@/server/slots-route')).getSlots(request),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('GET'),
    },
  },
});
