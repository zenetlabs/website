import { env } from 'cloudflare:workers';
import {
  parseCalendarSecret,
  readCalendarSecret,
  readSecret,
} from '@/server/calendar-config';

type Bindings = Pick<Cloudflare.Env, 'GOOGLE_CALENDAR' | 'TOOLS_BEARER_SECRET'>;

export async function getHealth(bindings: Bindings = env) {
  const [calendar, bearer] = await Promise.all([
    readCalendarSecret(bindings),
    readSecret(bindings.TOOLS_BEARER_SECRET),
  ]);
  return {
    ok: true,
    booking: (await parseCalendarSecret(calendar)) !== null,
    toolsBearer: bearer !== null,
  };
}

export async function healthResponse(): Promise<Response> {
  return Response.json(await getHealth(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
