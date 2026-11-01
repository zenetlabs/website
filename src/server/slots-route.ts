import { env } from 'cloudflare:workers';
import { isLiveHost } from '@/lib/redirects';
import { pageSlots } from '@/server/booking';
import { isLimited } from '@/server/rate-limit';
import { bookingDeps } from '@/server/tool-deps';

const DEADLINE_MS = 5_000;

// The whole horizon in one call, for the booking form to refresh its list
// after a slot was taken. Not a tool: it is the page's own data.
export async function getSlots(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (await isLimited(env.TOOLS_LIMITER, ip, 'slots')) {
    return Response.json(
      { status: 'unavailable' },
      { status: 429, headers: { ...headers, 'Retry-After': '60' } },
    );
  }
  const result = await pageSlots(
    {
      deps: bookingDeps(),
      now: Date.now(),
      isTest: !isLiveHost(new URL(request.url).hostname),
    },
    DEADLINE_MS,
  );
  return Response.json(result, { headers });
}
