import { createFileRoute } from '@tanstack/react-router';

let body: string | undefined;

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        if (body === undefined) {
          const { buildLlmsTxt } = await import('@/lib/llms');
          body = buildLlmsTxt();
        }
        return new Response(body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      },
    },
  },
});
