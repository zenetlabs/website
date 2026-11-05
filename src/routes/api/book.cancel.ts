import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/book/cancel')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import('@/server/book-routes')).cancelGet(request),
      POST: async ({ request }) =>
        (await import('@/server/book-routes')).cancelPost(request),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('GET, POST'),
    },
  },
});
