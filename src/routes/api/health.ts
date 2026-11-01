import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => (await import('@/server/health')).healthResponse(),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('GET'),
    },
  },
});
