// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseArgs, runVoiceAgents } from '../../../scripts/voice-agent.mjs';

const KEY = 'xi-api-key-value';
const SECRET = 'a-long-random-tool-secret-of-32-chars!!';
const FILE = JSON.stringify({
  version: 1,
  marker: 'zenetlabs-web',
  secret: { name: 'zenetlabs-tools-bearer' },
  tools: [
    {
      type: 'webhook',
      name: 'get_faq',
      api_schema: {
        request_headers: {
          Authorization: { secret_id: '$secret:zenetlabs-tools-bearer' },
        },
      },
    },
    { type: 'client', name: 'navigate' },
  ],
  agents: [
    {
      locale: 'en',
      config: {
        name: 'zenetlabs-voice-en',
        conversation_config: {
          agent: {
            prompt: {
              llm: 'glm-52',
              tool_ids: ['$tool:get_faq', '$tool:navigate'],
            },
          },
        },
      },
    },
    {
      locale: 'es',
      config: {
        name: 'zenetlabs-voice-es',
        conversation_config: {
          agent: {
            prompt: {
              llm: 'glm-52',
              tool_ids: ['$tool:get_faq', '$tool:navigate'],
            },
          },
        },
      },
    },
  ],
});

type Seed = {
  secret?: boolean;
  tools?: string[];
  agents?: string[];
  foreignTools?: string[];
  foreignAgents?: string[];
  // Model ids ElevenLabs lists; undefined answers 404, like a changed API.
  models?: string[];
};

function elevenLabs(seed: Seed = {}, fail?: { path: RegExp; status: number }) {
  const requests: Array<{
    method: string;
    path: string;
    body: unknown;
    key: string | null;
  }> = [];
  let next = 0;
  const send: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const path = `${url.pathname}${url.search}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    requests.push({
      method,
      path,
      body,
      key: new Headers(init?.headers).get('xi-api-key'),
    });
    if (fail?.path.test(url.pathname)) {
      return Response.json(
        { detail: [{ loc: ['body', 'x'], msg: 'bad value', type: 'v' }] },
        { status: fail.status },
      );
    }
    const route = `${method} ${url.pathname}`;
    if (route === 'GET /v1/convai/llm-list') {
      return seed.models
        ? Response.json({ llms: seed.models.map((llm) => ({ llm })) })
        : Response.json({}, { status: 404 });
    }
    if (route === 'GET /v1/convai/secrets') {
      return Response.json({
        secrets: seed.secret
          ? [{ secret_id: 'sec-1', name: 'zenetlabs-tools-bearer' }]
          : [],
      });
    }
    if (route === 'POST /v1/convai/secrets') {
      return Response.json({ type: 'stored', secret_id: 'sec-new' });
    }
    if (route === 'GET /v1/convai/tools') {
      return Response.json({
        tools: [
          ...(seed.tools ?? []).map((name) => ({
            id: `tool-${name}`,
            tool_config: { name, description: `Ours. [zenetlabs-web]` },
          })),
          ...(seed.foreignTools ?? []).map((name) => ({
            id: `foreign-${name}`,
            tool_config: { name, description: 'Another project.' },
          })),
        ],
        has_more: false,
      });
    }
    if (route === 'POST /v1/convai/tools') {
      next += 1;
      return Response.json({ id: `tool-new-${next}` });
    }
    if (route === 'GET /v1/convai/agents') {
      return Response.json({
        agents: [
          ...(seed.agents ?? []).map((name) => ({
            agent_id: `agent-${name}`,
            name,
            tags: ['zenetlabs-web'],
          })),
          ...(seed.foreignAgents ?? []).map((name) => ({
            agent_id: `foreign-${name}`,
            name,
            tags: [],
          })),
        ],
        has_more: false,
      });
    }
    if (route === 'POST /v1/convai/agents/create') {
      next += 1;
      return Response.json({ agent_id: `agent-new-${next}` });
    }
    return Response.json({}, { status: route.startsWith('PATCH') ? 200 : 404 });
  };
  return { send, requests };
}

async function run(
  command: 'plan' | 'apply',
  flags: Partial<{ updateOnly: boolean; rotateSecret: boolean }> = {},
  env: Record<string, string> = {
    ELEVENLABS_API_KEY: KEY,
    ZENETLABS_TOOL_SECRET: SECRET,
  },
  seed: Seed = {},
  fail?: { path: RegExp; status: number },
) {
  const fake = elevenLabs(seed, fail);
  const lines: string[] = [];
  const result = await runVoiceAgents({
    command,
    flags: { updateOnly: false, rotateSecret: false, file: 'x', ...flags },
    env,
    fetch: fake.send,
    readFile: async () => FILE,
    log: (line: string) => lines.push(line),
  });
  return { ...fake, lines, result };
}

const writes = <T extends { method: string }>(requests: T[]): T[] =>
  requests.filter(({ method }) => method !== 'GET');

describe('voice-agent apply', () => {
  it('creates the secret, the tools and both agents in order and prints both ids', async () => {
    const { requests, lines } = await run('apply');
    expect(
      writes(requests).map(({ method, path }) => `${method} ${path}`),
    ).toEqual([
      'POST /v1/convai/secrets',
      'POST /v1/convai/tools',
      'POST /v1/convai/tools',
      'POST /v1/convai/agents/create',
      'POST /v1/convai/agents/create',
    ]);
    expect(lines.at(-1)).toMatch(/^en=agent-new-\d+ es=agent-new-\d+$/);
    expect(requests.every(({ key }) => key === KEY)).toBe(true);
  });

  it('stores the secret as the whole header value and resolves every placeholder', async () => {
    const { requests } = await run('apply');
    const post = requests.find(
      ({ method, path }) => method === 'POST' && path === '/v1/convai/secrets',
    );
    expect(post?.body).toEqual({
      type: 'new',
      name: 'zenetlabs-tools-bearer',
      value: `Bearer ${SECRET}`,
    });
    const sent = JSON.stringify(writes(requests).map(({ body }) => body));
    expect(sent).not.toMatch(/\$secret:|\$tool:/);
    expect(sent).toContain('"secret_id":"sec-new"');
    expect(sent).toContain('"tool_ids":["tool-new-1","tool-new-2"]');
  });

  it('only PATCHes on a second run', async () => {
    const { requests, lines } = await run('apply', {}, undefined, {
      secret: true,
      tools: ['get_faq', 'navigate'],
      agents: ['zenetlabs-voice-en', 'zenetlabs-voice-es'],
    });
    expect(writes(requests).map(({ method }) => method)).toEqual([
      'PATCH',
      'PATCH',
      'PATCH',
      'PATCH',
    ]);
    expect(lines.at(-1)).toBe(
      'en=agent-zenetlabs-voice-en es=agent-zenetlabs-voice-es',
    );
  });

  it('--update-only never creates and never touches the secret', async () => {
    const seed = {
      secret: true,
      tools: ['get_faq', 'navigate'],
      agents: ['zenetlabs-voice-en', 'zenetlabs-voice-es'],
    };
    const { requests } = await run(
      'apply',
      { updateOnly: true },
      undefined,
      seed,
    );
    expect(writes(requests).some(({ method }) => method === 'POST')).toBe(
      false,
    );
    expect(requests.some(({ path }) => path.includes('/secrets/'))).toBe(false);
    await expect(run('apply', { updateOnly: true })).rejects.toThrow(
      '--update-only',
    );
    await expect(
      run('apply', { updateOnly: true }, undefined, { secret: true }),
    ).rejects.toThrow('--update-only');
  });

  it('--rotate-secret replaces the secret value and refuses a missing one', async () => {
    const { requests } = await run('apply', { rotateSecret: true }, undefined, {
      secret: true,
      tools: ['get_faq', 'navigate'],
      agents: ['zenetlabs-voice-en', 'zenetlabs-voice-es'],
    });
    const patch = requests.find(
      ({ path }) => path === '/v1/convai/secrets/sec-1',
    );
    expect(patch?.method).toBe('PATCH');
    expect(patch?.body).toEqual({
      type: 'update',
      name: 'zenetlabs-tools-bearer',
      value: `Bearer ${SECRET}`,
    });
    await expect(
      run('apply', { rotateSecret: true }, { ELEVENLABS_API_KEY: KEY }),
    ).rejects.toThrow('needs ZENETLABS_TOOL_SECRET');
  });

  it('refuses a short tool secret', async () => {
    await expect(
      run(
        'apply',
        {},
        { ELEVENLABS_API_KEY: KEY, ZENETLABS_TOOL_SECRET: 'short' },
      ),
    ).rejects.toThrow('at least 32');
  });

  it('requires the API key and sends nothing without it', async () => {
    await expect(run('plan', {}, {})).rejects.toThrow(
      'ELEVENLABS_API_KEY is required',
    );
  });

  it('stops on a 422 with the detail, and never prints a key or a secret', async () => {
    let message = '';
    try {
      await run('apply', {}, undefined, {}, { path: /tools$/, status: 422 });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('failed with 422');
    expect(message).toContain('body.x: bad value');
    expect(message).not.toContain(KEY);
    expect(message).not.toContain(SECRET);
  });
});

describe('the model check', () => {
  const seed = { models: ['gpt-6-luna', 'glm-52'] };

  it('passes a model ElevenLabs lists, in plan and in apply', async () => {
    await run('plan', {}, { ELEVENLABS_API_KEY: KEY }, seed);
    await run('apply', {}, undefined, seed);
  });

  it('stops before any write when the model is not listed', async () => {
    const fake = elevenLabs({ models: ['gpt-6-luna'] });
    await expect(
      runVoiceAgents({
        command: 'apply',
        flags: { updateOnly: false, rotateSecret: false, file: 'x' },
        env: { ELEVENLABS_API_KEY: KEY, ZENETLABS_TOOL_SECRET: SECRET },
        fetch: fake.send,
        readFile: async () => FILE,
        log: () => undefined,
      }),
    ).rejects.toThrow('Model "glm-52" of zenetlabs-voice-en is not in');
    expect(writes(fake.requests)).toEqual([]);
  });

  it('carries on, with a notice, when the list cannot be read', async () => {
    const { lines } = await run('plan', {}, { ELEVENLABS_API_KEY: KEY });
    expect(lines[0]).toContain('could not read ElevenLabs');
  });
});

describe('ownership', () => {
  it('never patches a tool of another project, and creates ours beside it', async () => {
    const { requests } = await run('apply', {}, undefined, {
      secret: true,
      tools: ['navigate'],
      foreignTools: ['get_faq'],
      agents: ['zenetlabs-voice-en', 'zenetlabs-voice-es'],
    });
    const toolWrites = writes(requests).filter(({ path }) =>
      path.startsWith('/v1/convai/tools'),
    );
    expect(toolWrites.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'POST /v1/convai/tools',
      'PATCH /v1/convai/tools/tool-navigate',
    ]);
    expect(requests.some(({ path }) => path.includes('foreign-'))).toBe(false);
  });

  it('stops, writing nothing, when an agent of that name is not ours', async () => {
    const fake = elevenLabs({ foreignAgents: ['zenetlabs-voice-en'] });
    await expect(
      runVoiceAgents({
        command: 'apply',
        flags: { updateOnly: false, rotateSecret: false, file: 'x' },
        env: { ELEVENLABS_API_KEY: KEY, ZENETLABS_TOOL_SECRET: SECRET },
        fetch: fake.send,
        readFile: async () => FILE,
        log: () => undefined,
      }),
    ).rejects.toThrow('exists and is not ours');
    expect(writes(fake.requests)).toEqual([]);
  });

  it('refuses a file without the owner marker', async () => {
    const fake = elevenLabs();
    await expect(
      runVoiceAgents({
        command: 'plan',
        flags: { updateOnly: false, rotateSecret: false, file: 'x' },
        env: { ELEVENLABS_API_KEY: KEY },
        fetch: fake.send,
        readFile: async () => FILE.replace('"marker":"zenetlabs-web",', ''),
        log: () => undefined,
      }),
    ).rejects.toThrow('no owner marker');
  });

  it('--update-only stops before any write when a new tool is missing', async () => {
    const fake = elevenLabs({
      secret: true,
      tools: ['get_faq'],
      agents: ['zenetlabs-voice-en', 'zenetlabs-voice-es'],
    });
    await expect(
      runVoiceAgents({
        command: 'apply',
        flags: { updateOnly: true, rotateSecret: false, file: 'x' },
        env: { ELEVENLABS_API_KEY: KEY },
        fetch: fake.send,
        readFile: async () => FILE,
        log: () => undefined,
      }),
    ).rejects.toThrow('found no tool navigate; nothing was changed');
    expect(writes(fake.requests)).toEqual([]);
  });
});

describe('voice-agent plan', () => {
  it('lists what apply would do and writes nothing', async () => {
    const { requests, lines } = await run(
      'plan',
      {},
      { ELEVENLABS_API_KEY: KEY },
      {
        secret: true,
        tools: ['get_faq'],
      },
    );
    expect(writes(requests)).toEqual([]);
    expect(lines.filter((line) => !line.startsWith('models:'))).toEqual([
      'secret zenetlabs-tools-bearer: keep',
      'tool get_faq: update',
      'tool navigate: create',
      'agent zenetlabs-voice-en: create',
      'agent zenetlabs-voice-es: create',
    ]);
  });
});

describe('parseArgs', () => {
  it('reads the command and flags', () => {
    expect(
      parseArgs(['apply', '--update-only', '--file', 'a.json']),
    ).toMatchObject({
      command: 'apply',
      flags: { updateOnly: true, rotateSecret: false, file: 'a.json' },
    });
  });

  it('refuses unknown commands and flags, and the two secret flags together', () => {
    expect(() => parseArgs(['destroy'])).toThrow('Usage');
    expect(() => parseArgs(['plan', '--force'])).toThrow('Unknown argument');
    expect(() =>
      parseArgs(['apply', '--update-only', '--rotate-secret']),
    ).toThrow('never touches the secret');
    expect(() => parseArgs(['plan', '--file'])).toThrow('--file needs a path');
  });
});
