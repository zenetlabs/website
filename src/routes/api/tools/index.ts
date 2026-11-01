import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/tools/')({
  server: {
    handlers: {
      GET: async () => (await import('@/server/tools/route')).getManifest(),
      ANY: async () =>
        (await import('@/server/responses')).methodNotAllowed('GET'),
    },
  },
});
