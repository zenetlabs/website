import { createFileRoute } from '@tanstack/react-router';
import { internalHandlers } from '@/server/responses';

export const Route = createFileRoute('/internal/leads.csv')({
  server: {
    handlers: internalHandlers(async () =>
      (await import('@/server/internal-routes')).leadsCsvFile(),
    ),
  },
});
