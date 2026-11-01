import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/tools/$name')({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        (await import('@/server/tools/route')).postTool(request, params.name),
      ANY: async ({ params }) =>
        (await import('@/server/tools/route')).wrongMethod(params.name),
    },
  },
});
