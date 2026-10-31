import { createFileRoute } from '@tanstack/react-router';
import { internalHandlers } from '@/server/responses';

export const Route = createFileRoute('/internal/leads')({
  server: {
    handlers: internalHandlers(async () =>
      (await import('@/server/internal-routes')).leadsPage(),
    ),
  },
});
