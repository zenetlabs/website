import { z } from 'zod';
import type { Locale } from '@/lib/i18n';
import type { SiteFlags } from '@/lib/page-registry';
import { VOICE_SESSION_VARIABLE } from '@/lib/voice-client';
import { offeredTools } from '@/server/tools/registry';
import type { Tool } from '@/server/tools/types';
import {
  type ElevenLabsObject,
  toElevenLabsSchema,
} from '@/server/voice/elevenlabs-schema';
import { voiceInput } from '@/server/voice/input';
import { voicePrompt } from '@/server/voice/prompt';
import { VOICE_SETTINGS } from '@/server/voice/settings';

const TOOL_SECRET_NAME = 'zenetlabs-tools-bearer';
const AGENT_PREFIX = 'zenetlabs-voice-';

// TODO(albert): review the spoken messages. Neither promises a booking while
// bookings are dark.
const FIRST_MESSAGE: Record<'booking' | 'plain', Record<Locale, string>> = {
  booking: {
    en: "Hi, I'm the Zenet Labs AI assistant, so you're talking to an AI, not a person. I can tell you about our services and prices, or find you a time for a call. How can I help?",
    es: 'Hola, soy el asistente de IA de Zenet Labs: estás hablando con una inteligencia artificial, no con una persona. Puedo contarte nuestros servicios y precios o buscarte hueco para una llamada. ¿En qué te ayudo?',
  },
  plain: {
    en: "Hi, I'm the Zenet Labs AI assistant, so you're talking to an AI, not a person. I can tell you about our services and prices. How can I help?",
    es: 'Hola, soy el asistente de IA de Zenet Labs: estás hablando con una inteligencia artificial, no con una persona. Puedo contarte nuestros servicios y precios. ¿En qué te ayudo?',
  },
};

const LIMIT_MESSAGE: Record<'booking' | 'plain', Record<Locale, string>> = {
  booking: {
    en: "We've reached the five-minute limit for this call. You can book a call on our booking page or write to hello at zenetlabs dot com. Goodbye!",
    es: 'Hemos llegado al límite de cinco minutos de esta llamada. Puedes reservar una llamada en nuestra página de reservas o escribir a hello arroba zenetlabs punto com. ¡Hasta luego!',
  },
  plain: {
    en: "We've reached the five-minute limit for this call. You can write to hello at zenetlabs dot com. Goodbye!",
    es: 'Hemos llegado al límite de cinco minutos de esta llamada. Puedes escribir a hello arroba zenetlabs punto com. ¡Hasta luego!',
  },
};

// Marks the tools and agents this site owns, so the apply script never touches
// a tool or agent of another project in the same workspace.
export const OWNER_MARKER = 'zenetlabs-web';

// The site fills these in from the session, so the model never sees them.
const SITE_FILLED = ['locale', 'timeZone'] as const;

type Header = { secret_id: string } | { variable_name: string };

type WebhookTool = {
  type: 'webhook';
  name: string;
  description: string;
  api_schema: {
    url: string;
    method: 'POST';
    content_type: 'application/json';
    request_headers: Record<string, Header>;
    request_body_schema: ElevenLabsObject;
  };
  response_timeout_secs: number;
  pre_tool_speech: 'auto';
  interruption_mode: 'allow' | 'disable_during_tool';
  follow_redirects: false;
};

type ClientTool = {
  type: 'client';
  name: string;
  description: string;
  expects_response: true;
  response_timeout_secs: number;
  parameters: ElevenLabsObject;
};

type ToolConfig = WebhookTool | ClientTool;

type VoiceAgentsFile = {
  version: 1;
  secret: { name: string };
  marker: string;
  tools: ToolConfig[];
  agents: Array<{ locale: Locale; config: Awaited<ReturnType<typeof agent>> }>;
};

type AgentSite = SiteFlags & { url: string };

// The parameters the model fills in: the registry input without what the site
// sets from the session.
function parametersOf(tool: Tool): ElevenLabsObject {
  return toElevenLabsSchema(z.toJSONSchema(voiceInput(tool), { io: 'input' }), {
    omit: SITE_FILLED,
    description: `The arguments of ${tool.name}.`,
  });
}

function webhook(tool: Tool, url: string): WebhookTool {
  const books = tool.name === 'book_meeting';
  return {
    type: 'webhook',
    name: tool.name,
    description: `${tool.description.en} [${OWNER_MARKER}]`,
    api_schema: {
      url: `${url}/api/tools/${tool.name}`,
      method: 'POST',
      content_type: 'application/json',
      request_headers: {
        Authorization: { secret_id: `$secret:${TOOL_SECRET_NAME}` },
        'X-Voice-Session': { variable_name: VOICE_SESSION_VARIABLE },
        // Binds the session to the one conversation that first uses it.
        'X-Voice-Conversation': { variable_name: 'system__conversation_id' },
      },
      request_body_schema: parametersOf(tool),
    },
    response_timeout_secs: books ? 30 : 20,
    pre_tool_speech: 'auto',
    interruption_mode: books ? 'disable_during_tool' : 'allow',
    follow_redirects: false,
  };
}

function client(tool: Tool): ClientTool {
  return {
    type: 'client',
    name: tool.name,
    description: `${tool.description.en} [${OWNER_MARKER}]`,
    expects_response: true,
    response_timeout_secs: 5,
    parameters: parametersOf(tool),
  };
}

async function agent(
  locale: Locale,
  site: SiteFlags,
  tools: readonly Tool[],
  dailyLimit: number,
) {
  const names = [...tools.map((tool) => tool.name), 'end_call'];
  const flavour = site.booking.published ? 'booking' : 'plain';
  return {
    name: `${AGENT_PREFIX}${locale}`,
    tags: [OWNER_MARKER],
    conversation_config: {
      agent: {
        language: locale,
        first_message: FIRST_MESSAGE[flavour][locale],
        disable_first_message_interruptions: true,
        max_conversation_duration_message: LIMIT_MESSAGE[flavour][locale],
        prompt: {
          prompt: await voicePrompt(locale, site, names),
          llm: VOICE_SETTINGS.llm,
          temperature: 0,
          enable_parallel_tool_calls: false,
          tool_ids: tools.map((tool) => `$tool:${tool.name}`),
          built_in_tools: {
            end_call: {
              name: 'end_call',
              description: '',
              params: { system_tool_type: 'end_call' },
            },
          },
        },
      },
      tts: {
        model_id: VOICE_SETTINGS.ttsModel[locale],
        ...(VOICE_SETTINGS.voices[locale] === null
          ? {}
          : { voice_id: VOICE_SETTINGS.voices[locale] }),
      },
      asr: { keywords: [...VOICE_SETTINGS.asrKeywords] },
      turn: { silence_end_call_timeout: VOICE_SETTINGS.silenceEndSeconds },
      conversation: {
        max_duration_seconds: VOICE_SETTINGS.maxCallSeconds,
        client_events: [
          'audio',
          'interruption',
          'user_transcript',
          'agent_response',
          'agent_response_correction',
          'client_tool_call',
          'agent_tool_response_full_payload',
        ],
      },
    },
    platform_settings: {
      // Auth on, no allowlist, no overrides: only a token from our server
      // starts a call, and the client cannot change the prompt or the voice.
      auth: { enable_auth: true },
      call_limits: {
        agent_concurrency_limit: VOICE_SETTINGS.concurrency,
        daily_limit: dailyLimit,
        bursting_enabled: false,
      },
      privacy: {
        record_voice: false,
        retention_days: VOICE_SETTINGS.retentionDays,
      },
    },
  };
}

// The two agents and their tools, as the apply script sends them. Secrets and
// ids are placeholders (`$secret:`, `$tool:`) the script resolves.
// The two agents share the day's cap: ElevenLabs' own per-agent limit is a
// backstop, so together they allow no more than the site does.
function dailyLimitFor(locale: Locale, dailySessions: number): number {
  const english = Math.ceil(dailySessions / 2);
  return locale === 'en' ? english : dailySessions - english;
}

export async function voiceAgentsFile(
  site: AgentSite,
  { dailySessions }: { dailySessions: number },
): Promise<VoiceAgentsFile> {
  const tools = offeredTools(site);
  return {
    version: 1,
    secret: { name: TOOL_SECRET_NAME },
    marker: OWNER_MARKER,
    tools: tools.map((tool) =>
      tool.clientOnly ? client(tool) : webhook(tool, site.url),
    ),
    agents: await Promise.all(
      (['en', 'es'] as const).map(async (locale) => ({
        locale,
        config: await agent(
          locale,
          site,
          tools,
          dailyLimitFor(locale, dailySessions),
        ),
      })),
    ),
  };
}
