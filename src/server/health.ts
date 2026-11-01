import { env } from 'cloudflare:workers';
import { SITE } from '@/lib/site';
import {
  parseCalendarSecret,
  readCalendarSecret,
  readSecret,
} from '@/server/calendar-config';

type Bindings = Pick<
  Cloudflare.Env,
  'GOOGLE_CALENDAR' | 'TOOLS_BEARER_SECRET' | 'AI' | 'ELEVENLABS_API_KEY'
>;

// Live means published, an agent for some locale and both secrets readable.
// No ElevenLabs call: health stays free.
export function voiceLive(
  site: Pick<typeof SITE, 'voice'>,
  secrets: { apiKey: string | null; toolSecret: string | null },
): boolean {
  const { published, agents } = site.voice;
  return (
    published &&
    (agents.en !== null || agents.es !== null) &&
    secrets.apiKey !== null &&
    secrets.toolSecret !== null
  );
}

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
  site: Pick<typeof SITE, 'voice'> = SITE,
) {
  const [calendar, bearer, voiceKey] = await Promise.all([
    readCalendarSecret(bindings),
    readSecret(bindings.TOOLS_BEARER_SECRET),
    readSecret(bindings.ELEVENLABS_API_KEY),
  ]);
  return {
    ok: true,
    booking: (await parseCalendarSecret(calendar)) !== null,
    toolsBearer: bearer !== null,
    assistant,
    voice: voiceLive(site, { apiKey: voiceKey, toolSecret: bearer }),
  };
}

export async function healthResponse(): Promise<Response> {
  return Response.json(await getHealth(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
