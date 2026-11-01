import { env } from 'cloudflare:workers';
import { SITE } from '@/lib/site';
import {
  parseCalendarSecret,
  readCalendarSecret,
  readSecret,
} from '@/server/calendar-config';

type Bindings = Pick<
  Cloudflare.Env,
  'GOOGLE_CALENDAR' | 'TOOLS_BEARER_SECRET' | 'AI'
>;

// Live means published and able to reach a model (the binding, or the scripted one locally).
export function assistantLive(
  site: Pick<typeof SITE, 'assistant'>,
  hasModel: boolean,
): boolean {
  return site.assistant.published && hasModel;
}

export async function getHealth(
  bindings: Bindings = env,
  assistant: boolean = assistantLive(
    SITE,
    __CHAT_FAKE__ || bindings.AI !== undefined,
  ),
) {
  const [calendar, bearer] = await Promise.all([
    readCalendarSecret(bindings),
    readSecret(bindings.TOOLS_BEARER_SECRET),
  ]);
  return {
    ok: true,
    booking: (await parseCalendarSecret(calendar)) !== null,
    toolsBearer: bearer !== null,
    assistant,
  };
}

export async function healthResponse(): Promise<Response> {
  return Response.json(await getHealth(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
