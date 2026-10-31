import { createFileRoute } from '@tanstack/react-router';
import { internalHandlers } from '@/server/responses';

export const Route = createFileRoute('/internal/leads/$id')({
  server: {
    handlers: internalHandlers(async ({ params }) =>
      (await import('@/server/internal-routes')).leadPage(params.id),
    ),
  },
});
