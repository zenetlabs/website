import { createFileRoute } from '@tanstack/react-router';
import { robotsTxt } from '@/lib/robots';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(robotsTxt(new URL(request.url).host), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        }),
    },
  },
});
