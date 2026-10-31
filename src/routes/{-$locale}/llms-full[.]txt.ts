import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/{-$locale}/llms-full.txt')({
  server: {
    handlers: {
      GET: async ({ params }) =>
        (await import('@/lib/llms')).llmsResponse('llms-full', params.locale),
      ANY: async () => (await import('@/lib/llms')).llmsNotFound(),
    },
  },
});
