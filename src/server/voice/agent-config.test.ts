// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isRecord } from '@/lib/is-record';
import { offeredTools } from '@/server/tools/registry';
import { voiceAgentsFile as build } from '@/server/voice/agent-config';
import type { ElevenLabsObject } from '@/server/voice/elevenlabs-schema';
import { voiceInput } from '@/server/voice/input';
import { VOICE_SETTINGS } from '@/server/voice/settings';
import { serverConfig, siteConfig } from '../../../site.config';

// The agents are built from the real production flags, so the committed file
// never carries a tool the site cannot serve yet.
const production = siteConfig('production');
const SITE = {
  url: production.url,
  calculator: production.calculator,
  booking: production.booking,
};
const LIVE = {
  ...SITE,
  booking: { published: true },
  calculator: { published: true },
};
const { dailySessions } = serverConfig('production').voice;

function voiceAgentsFile(site: typeof SITE = SITE) {
  return build(site, { dailySessions });
}

describe('voiceAgentsFile', () => {
  it('matches the generated file the apply script sends', async () => {
    const file = await voiceAgentsFile();
    await expect(`${JSON.stringify(file, null, 2)}\n`).toMatchFileSnapshot(
      '../../../elevenlabs/voice-agents.generated.json',
    );
  });

  it('keeps auth on, no overrides and the privacy and call limits', async () => {
    const { agents } = await voiceAgentsFile();
    expect(agents.map((agent) => agent.config.name)).toEqual([
      'zenetlabs-voice-en',
      'zenetlabs-voice-es',
    ]);
    for (const { config } of agents) {
      expect(config.platform_settings).toMatchObject({
        auth: { enable_auth: true },
        call_limits: { agent_concurrency_limit: 2, bursting_enabled: false },
        privacy: { record_voice: false, retention_days: 30 },
      });
      const text = JSON.stringify(config);
      expect(text).not.toContain('allowlist');
      expect(text).not.toContain('overrides');
      expect(config.conversation_config).toMatchObject({
        agent: {
          prompt: { temperature: 0, enable_parallel_tool_calls: false },
        },
        turn: { silence_end_call_timeout: 20 },
        conversation: { max_duration_seconds: 300 },
      });
    }
    const [en, es] = agents;
    expect(en?.config.conversation_config.agent.first_message).toContain('AI');
    expect(es?.config.conversation_config.agent.first_message).toContain('IA');
  });

  it('asks for the agent tool results in full', async () => {
    const { agents } = await voiceAgentsFile();
    for (const { config } of agents) {
      expect(JSON.stringify(config.conversation_config)).toContain(
        'agent_tool_response_full_payload',
      );
    }
  });

  it('marks every tool and agent as ours', async () => {
    const { tools, agents, marker } = await voiceAgentsFile(LIVE);
    expect(marker).toBe('zenetlabs-web');
    for (const tool of tools) {
      expect(tool.description.endsWith(`[${marker}]`)).toBe(true);
    }
    for (const { config } of agents) expect(config.tags).toEqual([marker]);
  });

  it('points every webhook at the canonical tool URL with the three headers', async () => {
    const { tools } = await voiceAgentsFile(LIVE);
    const webhooks = tools.filter((tool) => tool.type === 'webhook');
    expect(webhooks.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'check_availability',
      'book_meeting',
    ]);
    for (const tool of webhooks) {
      expect(tool.api_schema.url).toBe(
        `https://zenetlabs.com/api/tools/${tool.name}`,
      );
      expect(tool.api_schema.request_headers).toEqual({
        Authorization: { secret_id: '$secret:zenetlabs-tools-bearer' },
        'X-Voice-Session': { variable_name: 'secret__zl_session' },
        'X-Voice-Conversation': { variable_name: 'system__conversation_id' },
      });
      expect(JSON.stringify(tool.api_schema.request_body_schema)).not.toMatch(
        /"(locale|timeZone)"/,
      );
    }
  });

  it('lists exactly the tools the agents reference', async () => {
    const { tools, agents } = await voiceAgentsFile(LIVE);
    const names = tools.map((tool) => `$tool:${tool.name}`);
    for (const { config } of agents) {
      expect(config.conversation_config.agent.prompt.tool_ids).toEqual(names);
    }
    expect(tools.map((tool) => tool.name)).toContain('navigate');
  });

  it('carries no secret-looking value', async () => {
    const text = JSON.stringify(await voiceAgentsFile(LIVE));
    expect(text).not.toMatch(/sk_[a-z0-9]{10,}|Bearer [A-Za-z0-9+/=]{16,}/);
  });
});

describe('the agents while bookings are dark', () => {
  it('get no booking tool, no booking rule and no promise of a call', async () => {
    const { tools, agents } = await voiceAgentsFile({
      ...SITE,
      booking: { published: false },
    });
    expect(tools.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'navigate',
    ]);
    for (const { config } of agents) {
      const text = JSON.stringify(config.conversation_config.agent);
      expect(text).not.toMatch(
        /book_meeting|check_availability|booking page|página de reservas|find you a time|buscarte hueco/,
      );
      expect(text).toMatch(/cannot book calls|No puedes reservar llamadas/);
    }
  });

  it('follow the real production flags in the committed file', () => {
    expect(SITE.booking).toBe(production.booking);
  });
});

describe('the book_meeting tool', () => {
  it('asks the model for the visitor confirmation', async () => {
    const { tools } = await voiceAgentsFile(LIVE);
    const book = tools.find((tool) => tool.name === 'book_meeting');
    if (book?.type !== 'webhook') throw new Error('book_meeting is a webhook');
    const schema = book.api_schema.request_body_schema;
    expect(schema.required).toEqual(
      expect.arrayContaining(['slot', 'name', 'email', 'topic', 'confirmed']),
    );
    expect(schema.properties.confirmed).toMatchObject({ type: 'boolean' });
  });
});

const SAMPLES: Record<string, unknown> = {
  query: 'how long does a project take',
  service: 'agent',
  from: '2027-01-12',
  to: '2027-01-13',
  slot: '2027-01-12T09:00:00.000Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
  topic: 'We want to automate our inbox triage.',
  page: 'pricing',
  section: 'faq',
};

// A body the way the model would build it from the schema ElevenLabs was given.
function sample(
  schema: ElevenLabsObject['properties'][string],
  name: string,
  optional: boolean,
): unknown {
  if (schema.type === 'boolean') return true;
  if (schema.type === 'object') return bodyOf(schema, optional);
  if (schema.type === 'array') return [sample(schema.items, name, optional)];
  if (schema.enum) return schema.enum[0];
  if (!(name in SAMPLES)) throw new Error(`no sample for ${name}`);
  return SAMPLES[name];
}

function bodyOf(schema: ElevenLabsObject, withOptional: boolean) {
  const body: Record<string, unknown> = {};
  for (const [name, property] of Object.entries(schema.properties)) {
    if (withOptional || schema.required?.includes(name)) {
      body[name] = sample(property, name, withOptional);
    }
  }
  return body;
}

describe('every tool the agents get', () => {
  it('accepts, on the server, a body built from the schema ElevenLabs was given', async () => {
    const { tools } = await voiceAgentsFile(LIVE);
    const offered = offeredTools(LIVE);
    expect(tools.map((tool) => tool.name)).toEqual(
      offered.map((tool) => tool.name),
    );
    for (const generated of tools) {
      const schema =
        generated.type === 'webhook'
          ? generated.api_schema.request_body_schema
          : generated.parameters;
      const tool = offered.find((entry) => entry.name === generated.name);
      if (!tool) throw new Error(`no tool ${generated.name}`);
      for (const withOptional of [false, true]) {
        const body = bodyOf(schema, withOptional);
        // The site adds the locale and the zone from the session.
        const parsed = voiceInput(tool).safeParse({
          ...body,
          locale: 'en',
          timeZone: 'Europe/Madrid',
        });
        expect(
          parsed.success,
          `${generated.name} ${withOptional ? 'with' : 'without'} optional fields: ${JSON.stringify(body)}`,
        ).toBe(true);
        expect(isRecord(body)).toBe(true);
      }
    }
  });

  it('fails the server parser on a booking without the confirmation', () => {
    const book = offeredTools(LIVE).find(
      (tool) => tool.name === 'book_meeting',
    );
    if (!book) throw new Error('no book_meeting');
    const body = {
      slot: SAMPLES.slot,
      name: SAMPLES.name,
      email: SAMPLES.email,
      topic: SAMPLES.topic,
    };
    expect(voiceInput(book).safeParse(body).success).toBe(false);
    expect(book.input.safeParse(body).success).toBe(true);
  });
});

describe('the spoken limits', () => {
  it('say five minutes while the call is capped at 300 seconds', async () => {
    expect(VOICE_SETTINGS.maxCallSeconds).toBe(300);
    const { agents } = await voiceAgentsFile(LIVE);
    const [en, es] = agents;
    const text = (agent: typeof en) =>
      JSON.stringify(agent?.config.conversation_config.agent);
    expect(text(en)).toContain('five-minute limit');
    expect(text(en)).toContain('at most five minutes');
    expect(text(es)).toContain('límite de cinco minutos');
    expect(text(es)).toContain('como mucho cinco minutos');
  });

  it("splits the site's daily cap between the two agents", async () => {
    const { agents } = await voiceAgentsFile();
    const limits = agents.map(
      ({ config }) => config.platform_settings.call_limits.daily_limit,
    );
    expect(limits.reduce((sum, limit) => sum + limit, 0)).toBe(dailySessions);
    const odd = await build(SITE, { dailySessions: 7 });
    expect(
      odd.agents.map(
        ({ config }) => config.platform_settings.call_limits.daily_limit,
      ),
    ).toEqual([4, 3]);
  });
});
