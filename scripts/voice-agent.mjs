// Creates or updates the ElevenLabs voice agents and their tools from
// elevenlabs/voice-agents.generated.json. Needs Node 24+ and no dependency.
//
//   ELEVENLABS_API_KEY=<elevenlabs-api-key> node scripts/voice-agent.mjs plan
//   ELEVENLABS_API_KEY=<elevenlabs-api-key> ZENETLABS_TOOL_SECRET=<tool-secret> \
//     node scripts/voice-agent.mjs apply [--update-only | --rotate-secret] [--file <path>]
//
// plan    prints what apply would create or update (reads only).
// apply   upserts the workspace secret, the tools and the two agents, then
//         prints `en=<agent-id> es=<agent-id>`.
// --update-only    never creates anything and never touches the secret (deploys);
//                  it stops before any write when something it would update is missing.
// --rotate-secret  replaces the workspace secret with ZENETLABS_TOOL_SECRET.
// The tool secret is the value stored in Cloudflare as
// ZENETLABS_PROD_ELEVENLABS_TOOL_SECRET. Neither it nor the API key is printed.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DEFAULT_FILE = fileURLToPath(
  new URL('../elevenlabs/voice-agents.generated.json', import.meta.url),
);
const DEFAULT_ORIGIN = 'https://api.elevenlabs.io';
const MIN_SECRET_LENGTH = 32;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = { updateOnly: false, rotateSecret: false, file: DEFAULT_FILE };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--update-only') flags.updateOnly = true;
    else if (arg === '--rotate-secret') flags.rotateSecret = true;
    else if (arg === '--file') {
      const value = rest[index + 1];
      if (!value) throw new Error('--file needs a path');
      flags.file = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (command !== 'plan' && command !== 'apply') {
    throw new Error('Usage: voice-agent.mjs plan|apply [flags]');
  }
  if (flags.updateOnly && flags.rotateSecret) {
    throw new Error('--update-only never touches the secret; drop one flag');
  }
  return { command, flags };
}

function resolvePlaceholders(value, ids) {
  if (typeof value === 'string') {
    if (value.startsWith('$secret:')) {
      const id = ids.secrets.get(value.slice('$secret:'.length));
      if (id === undefined) throw new Error(`No id for ${value}`);
      return id;
    }
    if (value.startsWith('$tool:')) {
      const id = ids.tools.get(value.slice('$tool:'.length));
      if (id === undefined) throw new Error(`No id for ${value}`);
      return id;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolvePlaceholders(entry, ids));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolvePlaceholders(entry, ids),
      ]),
    );
  }
  return value;
}

function describeFailure(body) {
  const detail = body?.detail;
  if (Array.isArray(detail)) {
    return detail
      .slice(0, 5)
      .map((item) => `${(item?.loc ?? []).join('.')}: ${item?.msg ?? ''}`)
      .join('; ');
  }
  if (typeof detail === 'string') return detail.slice(0, 300);
  if (typeof detail?.message === 'string') return detail.message.slice(0, 300);
  return '';
}

function client({ apiKey, origin, fetch: send }) {
  return async (method, path, body) => {
    const response = await send(`${origin}${path}`, {
      method,
      headers: {
        'xi-api-key': apiKey,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const parsed = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(
        `ElevenLabs ${method} ${path.split('?')[0]} failed with ${response.status} ${describeFailure(parsed)}`.trim(),
      );
    }
    return parsed;
  };
}

async function listAll(call, path, key, extra = '') {
  const found = [];
  let cursor = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await call(
      'GET',
      `${path}?page_size=${PAGE_SIZE}${extra}${cursor}`,
    );
    found.push(...(result?.[key] ?? []));
    if (!result?.next_cursor || result.has_more === false) return found;
    cursor = `&cursor=${encodeURIComponent(result.next_cursor)}`;
  }
  throw new Error(`${path} has more pages than expected`);
}

// The model ids ElevenLabs accepts for an agent. Null when the list cannot be
// read: the API itself still refuses an unknown model, so that only costs the
// early error.
async function supportedModels(call, log) {
  try {
    const result = await call('GET', '/v1/convai/llm-list');
    const list = Array.isArray(result) ? result : result?.llms;
    const ids = (list ?? []).flatMap((entry) =>
      typeof entry?.llm === 'string' ? [entry.llm] : [],
    );
    if (ids.length > 0) return new Set(ids);
  } catch {
    // Handled below like an unrecognised answer.
  }
  log("models: could not read ElevenLabs' list, the API will check the model");
  return null;
}

function checkModels(file, models) {
  if (models === null) return;
  for (const { config } of file.agents) {
    const llm = config?.conversation_config?.agent?.prompt?.llm;
    if (typeof llm === 'string' && !models.has(llm)) {
      throw new Error(
        `Model "${llm}" of ${config.name} is not in ElevenLabs' supported list; change VOICE_SETTINGS.llm and regenerate the file`,
      );
    }
  }
}

// A tool is ours when its description ends with the marker the generator adds.
function ownsTool(entry, marker) {
  const description = entry?.tool_config?.description;
  return typeof description === 'string' && description.endsWith(`[${marker}]`);
}

function toolId(entry) {
  return entry?.id;
}

export async function runVoiceAgents({
  command,
  flags,
  env,
  fetch: send = fetch,
  readFile: read = (path) => readFile(path, 'utf8'),
  log = console.log,
}) {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required');
  const file = JSON.parse(await read(flags.file));
  if (file.version !== 1) throw new Error('Unsupported generated file version');
  const apply = command === 'apply';
  const toolSecret = env.ZENETLABS_TOOL_SECRET;
  const writesSecret = apply && !flags.updateOnly;
  if (
    (flags.rotateSecret || writesSecret) &&
    toolSecret !== undefined &&
    toolSecret.length < MIN_SECRET_LENGTH
  ) {
    throw new Error(
      `ZENETLABS_TOOL_SECRET must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  if (flags.rotateSecret && !toolSecret) {
    throw new Error('--rotate-secret needs ZENETLABS_TOOL_SECRET');
  }
  const call = client({
    apiKey,
    origin: env.ELEVENLABS_API_ORIGIN || DEFAULT_ORIGIN,
    fetch: send,
  });
  const ids = { secrets: new Map(), tools: new Map() };

  checkModels(file, await supportedModels(call, log));

  const marker = file.marker;
  if (typeof marker !== 'string' || marker === '') {
    throw new Error('The generated file has no owner marker; regenerate it');
  }

  // Everything is read and checked before anything is written, so a refusal
  // never leaves the workspace half updated.
  const secretName = file.secret.name;
  const secret = (
    await listAll(
      call,
      '/v1/convai/secrets',
      'secrets',
      `&search=${encodeURIComponent(secretName)}`,
    )
  ).find((entry) => entry.name === secretName);

  // Only tools and agents carrying our marker are ever patched. A tool of
  // another project with the same name is left alone and ours is created beside
  // it; an agent cannot share a name, so that case stops here.
  const ownedTools = (await listAll(call, '/v1/convai/tools', 'tools')).filter(
    (entry) => ownsTool(entry, marker),
  );
  const foundTools = new Map(
    file.tools.map((tool) => [
      tool.name,
      ownedTools.find((entry) => entry.tool_config.name === tool.name),
    ]),
  );
  const existingAgents = await listAll(
    call,
    '/v1/convai/agents',
    'agents',
    '&search=zenetlabs-voice-',
  );
  const foundAgents = new Map(
    file.agents.map(({ config }) => {
      const same = existingAgents.find((entry) => entry.name === config.name);
      if (same !== undefined && !(same.tags ?? []).includes(marker)) {
        throw new Error(
          `Agent ${config.name} exists and is not ours (no "${marker}" tag); refusing to change it`,
        );
      }
      return [config.name, same];
    }),
  );

  if (apply && flags.updateOnly) {
    const missing = [
      ...(secret === undefined ? [`secret ${secretName}`] : []),
      ...file.tools
        .filter((tool) => foundTools.get(tool.name) === undefined)
        .map((tool) => `tool ${tool.name}`),
      ...file.agents
        .filter(({ config }) => foundAgents.get(config.name) === undefined)
        .map(({ config }) => `agent ${config.name}`),
    ];
    if (missing.length > 0) {
      throw new Error(
        `--update-only found no ${missing.join(', ')}; nothing was changed. Run pnpm voice:apply once without it to create them`,
      );
    }
  }

  if (secret === undefined) {
    log(`secret ${secretName}: create`);
    if (apply) {
      if (!toolSecret) throw new Error('ZENETLABS_TOOL_SECRET is required');
      const created = await call('POST', '/v1/convai/secrets', {
        type: 'new',
        name: secretName,
        value: `Bearer ${toolSecret}`,
      });
      ids.secrets.set(secretName, created.secret_id);
    } else ids.secrets.set(secretName, '<new>');
  } else {
    log(`secret ${secretName}: ${flags.rotateSecret ? 'rotate' : 'keep'}`);
    ids.secrets.set(secretName, secret.secret_id);
    if (apply && flags.rotateSecret) {
      await call('PATCH', `/v1/convai/secrets/${secret.secret_id}`, {
        type: 'update',
        name: secretName,
        value: `Bearer ${toolSecret}`,
      });
    }
  }

  for (const tool of file.tools) {
    const found = foundTools.get(tool.name);
    log(`tool ${tool.name}: ${found ? 'update' : 'create'}`);
    if (!apply) {
      ids.tools.set(tool.name, toolId(found) ?? '<new>');
      continue;
    }
    const tool_config = resolvePlaceholders(tool, ids);
    if (found) {
      await call('PATCH', `/v1/convai/tools/${toolId(found)}`, { tool_config });
      ids.tools.set(tool.name, toolId(found));
    } else {
      const created = await call('POST', '/v1/convai/tools', { tool_config });
      ids.tools.set(tool.name, created.id);
    }
  }

  const agentIds = {};
  for (const { locale, config } of file.agents) {
    const found = foundAgents.get(config.name);
    log(`agent ${config.name}: ${found ? 'update' : 'create'}`);
    if (!apply) continue;
    const body = resolvePlaceholders(config, ids);
    if (found) {
      await call('PATCH', `/v1/convai/agents/${found.agent_id}`, body);
      agentIds[locale] = found.agent_id;
    } else {
      const created = await call('POST', '/v1/convai/agents/create', body);
      agentIds[locale] = created.agent_id;
    }
  }
  if (apply) log(`en=${agentIds.en} es=${agentIds.es}`);
  return agentIds;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { command, flags } = parseArgs(process.argv.slice(2));
    await runVoiceAgents({ command, flags, env: process.env });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'failed');
    process.exitCode = 1;
  }
}
