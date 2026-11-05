import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/book/confirm')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        (await import('@/server/book-routes')).getConfirmView(request),
      POST: async ({ request }) =>
        (await import('@/server/book-routes')).confirmPost(request),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('GET, POST'),
    },
  },
});
