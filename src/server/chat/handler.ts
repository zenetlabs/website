import {
  isStepCount,
  type LanguageModel,
  type ModelMessage,
  streamText,
} from 'ai';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import { loadPricingContent } from '@/content/load';
import {
  CHAT_LIMITS,
  type ChatError,
  type ChatEvent,
  type Proposal,
} from '@/lib/chat-events';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { isLiveHost } from '@/lib/redirects';
import { canonicalZone } from '@/lib/slots';
import { noop } from '@/lib/time';
import type { BookingDeps } from '@/server/booking';
import {
  guardSentence,
  numbersIn,
  officialAmounts,
  SentenceBuffer,
  toolNumbers,
} from '@/server/chat/guard';
import {
  systemPrompt,
  turnContext,
  VISITOR_BOUNDARY,
} from '@/server/chat/prompt';
import { chatRequestSchema, splitTest } from '@/server/chat/schema';
import {
  claimTurn,
  countAddressTurn,
  createSession,
  history,
  persistTurn,
  refuse,
  reserveNeurons,
  todayNeurons,
} from '@/server/chat/store';
import { aiTools, chatToolNames, chatTools } from '@/server/chat/tools';
import {
  estimateTokens,
  NO_USAGE,
  neuronsFor,
  reservationFor,
  type TurnUsage,
  utcDay,
} from '@/server/chat/usage';
import type { Limiter } from '@/server/rate-limit';
import { gate, verifyHuman } from '@/server/request';
import { errorName, jsonError } from '@/server/responses';

const MAX_BODY_BYTES = 8192;
const MAX_STEPS = 4;
const MAX_OUTPUT_TOKENS = 600;

export type ChatDeps = BookingDeps & {
  limiter: Limiter;
  turnstileSecret: () => Promise<string>;
  now: () => number;
  model: (sessionId: string) => Promise<LanguageModel | null>;
};

const STATUS = {
  origin: 403,
  unsupported: 415,
  rate: 429,
  'too-large': 413,
  invalid: 400,
  captcha: 403,
  session: 404,
  'session-full': 409,
  budget: 503,
  unavailable: 503,
} as const satisfies Record<ChatError, number>;

function reject(error: ChatError): Response {
  return jsonError(error, STATUS[error]);
}

const encoder = new TextEncoder();

function encodeEvent(event: ChatEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

type Turn = {
  deps: ChatDeps;
  model: LanguageModel;
  sessionId: string;
  isNew: boolean;
  locale: Locale;
  message: string;
  page: string;
  timeZone: string;
  remaining: number;
  reserved: number;
  hostname: string;
  emit: (event: ChatEvent) => void;
};

type Outcome = {
  shown: string;
  guards: number;
  failed: boolean;
  responseMessages: ModelMessage[];
  // What the SDK reported for the whole turn, when it got that far.
  usage: TurnUsage | null;
  // What the steps that finished reported, for a turn that failed half-way.
  completed: TurnUsage;
  tools: string[];
  steps: number;
  firstTextMs: number | null;
  promptChars: number;
  historyChars: number;
};

function newOutcome(): Outcome {
  return {
    shown: '',
    guards: 0,
    failed: false,
    responseMessages: [],
    usage: null,
    completed: { ...NO_USAGE },
    tools: [],
    steps: 0,
    firstTextMs: null,
    promptChars: 0,
    historyChars: 0,
  };
}

type StepUsage = {
  inputTokens: number | undefined;
  inputTokenDetails: { cacheReadTokens: number | undefined };
  outputTokens: number | undefined;
};

function usageOf(step: StepUsage): TurnUsage {
  return {
    inputTokens: step.inputTokens ?? 0,
    cachedInputTokens: step.inputTokenDetails.cacheReadTokens ?? 0,
    outputTokens: step.outputTokens ?? 0,
  };
}

async function modelTurn(turn: Turn, outcome: Outcome): Promise<void> {
  const { deps, locale } = turn;
  const started = Date.now();
  const names = chatToolNames(deps.site);
  const [past, { services }, system] = await Promise.all([
    history(deps.db, turn.sessionId),
    loadPricingContent(locale),
    systemPrompt(locale, deps.site, names),
  ]);
  const allowed = new Set([
    ...officialAmounts(services),
    ...toolNumbers(past.messages),
  ]);
  // The time and the messages left change every turn, so they ride with the
  // visitor's message and the system prompt stays one cacheable prefix.
  const context = turnContext({
    locale,
    now: deps.now(),
    timeZone: turn.timeZone,
    page: turn.page,
    remaining: turn.remaining,
  });

  outcome.promptChars = system.length + context.length;
  outcome.historyChars = past.chars;
  const buffer = new SentenceBuffer();
  let pricingOffered = false;
  // After a leak the model is read to its end and ignored: aborting a stream in
  // flight makes the SDK throw inside its own pipeline.
  let stopped = false;

  const say = (text: string) => {
    if (text === '') return;
    outcome.shown += text;
    outcome.firstTextMs ??= Date.now() - started;
    turn.emit({ t: 'text', v: text });
  };
  const offerPricing = () => {
    if (pricingOffered) return;
    pricingOffered = true;
    turn.emit({
      t: 'navigate',
      page: 'pricing',
      href: pagePath(locale, 'pricing'),
    });
  };
  const speak = (sentence: string) => {
    if (stopped) return;
    const guarded = guardSentence(sentence, {
      locale,
      allowed,
      previous: outcome.shown,
    });
    if (guarded.guard !== null) outcome.guards += 1;
    say(guarded.text);
    if (guarded.guard === 'price') offerPricing();
    if (guarded.guard === 'leak') stopped = true;
  };

  const pending: { proposal: Proposal | null } = { proposal: null };
  const tools = chatTools({
    locale,
    timeZone: turn.timeZone,
    site: deps.site,
    run: {
      now: deps.now(),
      channel: 'chat',
      hostname: turn.hostname,
      consentAt: null,
      attribution: null,
      chatSessionId: null,
      deps,
    },
    onNavigate: (event) => {
      if (!stopped) turn.emit({ t: 'navigate', ...event });
    },
    onProposal: (next) => {
      pending.proposal = next;
    },
  });

  const result = streamText({
    model: turn.model,
    instructions: system,
    messages: [
      ...past.messages,
      {
        role: 'user',
        content: [
          { type: 'text', text: context },
          { type: 'text', text: VISITOR_BOUNDARY },
          { type: 'text', text: turn.message },
        ],
      },
    ],
    tools: aiTools(tools),
    activeTools: names,
    stopWhen: [isStepCount(MAX_STEPS), () => stopped],
    prepareStep: ({ stepNumber }) =>
      stepNumber >= MAX_STEPS - 1 ? { toolChoice: 'none' } : {},
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    onError: noop,
  });

  for await (const part of result.stream) {
    if (part.type === 'finish-step') {
      outcome.steps += 1;
      const step = usageOf(part.usage);
      outcome.completed = {
        inputTokens: outcome.completed.inputTokens + step.inputTokens,
        cachedInputTokens:
          outcome.completed.cachedInputTokens + step.cachedInputTokens,
        outputTokens: outcome.completed.outputTokens + step.outputTokens,
      };
    }
    if (stopped) continue;
    switch (part.type) {
      case 'text-delta':
        for (const sentence of buffer.push(part.text)) speak(sentence);
        break;
      case 'text-end':
        speak(buffer.flush());
        break;
      case 'tool-call':
        outcome.tools.push(part.toolName);
        turn.emit({ t: 'tool', name: part.toolName });
        break;
      case 'tool-result':
        for (const value of numbersIn(part.output)) allowed.add(value);
        break;
      case 'tool-error':
        console.error('chat: tool failed', {
          session: turn.sessionId,
          code: errorName(part.error),
        });
        break;
      case 'error':
        outcome.failed = true;
        console.error('chat: model failed', {
          session: turn.sessionId,
          code: errorName(part.error),
        });
        stopped = true;
        break;
      default:
        break;
    }
  }
  if (!stopped) speak(buffer.flush());
  if (pending.proposal !== null && !stopped) {
    turn.emit({ t: 'confirm_booking', proposal: pending.proposal });
  }
  if (!outcome.failed) {
    try {
      const [messages, total] = await Promise.all([
        result.responseMessages,
        result.totalUsage,
      ]);
      outcome.responseMessages = messages;
      outcome.usage = usageOf(total);
    } catch {
      outcome.failed = true;
    }
  }
}

async function runTurn(turn: Turn): Promise<void> {
  const { deps } = turn;
  const started = Date.now();
  if (turn.isNew) turn.emit({ t: 'session', id: turn.sessionId });
  const outcome = newOutcome();
  try {
    await modelTurn(turn, outcome);
  } catch (error) {
    outcome.failed = true;
    console.error('chat: turn failed', {
      session: turn.sessionId,
      code: errorName(error),
    });
  }
  const failed = outcome.failed;
  const shown = outcome.shown;
  const counted = outcome.usage ?? outcome.completed;
  // A provider that reports nothing is billed from the text length: every step
  // sends the whole prompt again.
  const usage =
    counted.inputTokens === 0 && counted.outputTokens === 0
      ? {
          ...counted,
          inputTokens:
            estimateTokens(
              outcome.promptChars + outcome.historyChars + turn.message.length,
            ) * Math.max(1, outcome.steps),
          outputTokens: estimateTokens(shown.length),
        }
      : counted;
  const model = deps.server.assistant.model;
  const neurons = neuronsFor(model, usage);
  const stored = persistTurn(deps.db, {
    sessionId: turn.sessionId,
    now: deps.now(),
    user: turn.message,
    responseMessages: outcome.responseMessages,
    shown,
    usage,
    neurons,
    reserved: turn.reserved,
    guards: outcome.guards,
  }).catch((error: unknown) => {
    console.error('chat: persist failed', {
      session: turn.sessionId,
      code: errorName(error),
    });
  });
  deps.waitUntil(stored);
  await stored;
  if (failed) turn.emit({ t: 'error', code: 'unavailable' });
  turn.emit({ t: 'done', remaining: turn.remaining });
  console.log('chat: turn', {
    session: turn.sessionId,
    model,
    ms: Date.now() - started,
    firstTextMs: outcome.firstTextMs,
    steps: outcome.steps,
    tools: outcome.tools,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    neurons,
    guards: outcome.guards,
  });
}

function streamTurn(turn: Omit<Turn, 'emit'>): Response {
  let open = true;
  const body = new ReadableStream<Uint8Array>({
    start(stream) {
      const emit = (event: ChatEvent) => {
        if (open) stream.enqueue(encodeEvent(event));
      };
      const work = runTurn({ ...turn, emit })
        .catch((error: unknown) => {
          console.error('chat: stream failed', {
            session: turn.sessionId,
            code: errorName(error),
          });
        })
        .finally(() => {
          if (open) stream.close();
          open = false;
        });
      turn.deps.waitUntil(work);
    },
    // The model keeps going and the turn is stored: a closed tab loses nothing.
    cancel() {
      open = false;
    },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Content-Encoding': 'identity',
    },
  });
}

// One address may spend only so many turns a day. Counted by a keyed
// fingerprint of the address (see countAddressTurn); when the key is not
// readable nothing is counted, and the Turnstile check already failed for a
// new session in that case.
async function withinAddressShare(
  deps: ChatDeps,
  secret: { value: string } | null,
  ip: string | null,
  day: string,
): Promise<boolean> {
  if (secret === null) return true;
  try {
    return await countAddressTurn(deps.db, {
      secret: secret.value,
      address: ip ?? 'unknown',
      day,
      limit: deps.server.assistant.perAddressDailyTurns,
    });
  } catch (error) {
    console.error('chat: address count failed', { code: errorName(error) });
    return true;
  }
}

export async function handleChatPost(
  request: Request,
  deps: ChatDeps,
): Promise<Response> {
  if (!deps.site.assistant.published) return reject('unavailable');
  const gated = await gate({
    request,
    schema: chatRequestSchema,
    label: 'chat',
    limiter: deps.limiter,
    maxBytes: MAX_BODY_BYTES,
    secret: deps.turnstileSecret,
  });
  if (gated.status === 'rejected') return reject(gated.error);
  const { input, ip } = gated;
  const sessionId = input.sessionId ?? crypto.randomUUID();
  const { hostname } = new URL(request.url);
  const { message, marked } = splitTest(input.message);
  const now = deps.now();
  const day = utcDay(now);
  const { dailyNeuronBudget, model: modelId } = deps.server.assistant;

  const [model, spent] = await Promise.all([
    deps.model(sessionId).catch((error: unknown) => {
      console.error('chat: model failed', { code: errorName(error) });
      return undefined;
    }),
    todayNeurons(deps.db, day).catch((error: unknown) => {
      console.error('chat: budget check failed', { code: errorName(error) });
      return undefined;
    }),
  ]);
  if (model === undefined || spent === undefined) return reject('unavailable');
  if (model === null) {
    console.error('chat: model unavailable', { code: 'unconfigured' });
    return reject('unavailable');
  }
  if (spent >= dailyNeuronBudget) {
    await refuse(deps.db, day).catch(noop);
    return reject('budget');
  }

  let used: number;
  if (input.turnstileToken !== undefined) {
    const failure = await verifyHuman({
      token: input.turnstileToken,
      action: 'chat',
      label: 'chat',
      ip,
      secret: gated.secret,
      fetch: deps.fetch,
    });
    if (failure !== null) return reject(failure);
  }
  if (!(await withinAddressShare(deps, await gated.secret, ip, day))) {
    return reject('budget');
  }
  if (input.turnstileToken !== undefined) {
    try {
      await createSession(deps.db, {
        id: sessionId,
        now,
        locale: input.locale,
        model: modelId,
        startPage: input.page,
        isTest: !isLiveHost(hostname) || marked,
      });
    } catch (error) {
      console.error('chat: session failed', { code: errorName(error) });
      return reject('unavailable');
    }
    used = 1;
  } else {
    try {
      const claim = await claimTurn(deps.db, sessionId, now);
      if (claim.status !== 'ok') return reject(claim.status);
      if (claim.session.locale !== input.locale) return reject('invalid');
      used = claim.session.userMessages;
    } catch (error) {
      console.error('chat: session failed', { code: errorName(error) });
      return reject('unavailable');
    }
  }

  // Set the turn's expected cost aside, atomically, so turns running at the
  // same time cannot all pass the budget check above.
  const reserved = reservationFor(modelId);
  try {
    if (!(await reserveNeurons(deps.db, day, reserved, dailyNeuronBudget))) {
      await refuse(deps.db, day);
      return reject('budget');
    }
  } catch (error) {
    console.error('chat: reservation failed', { code: errorName(error) });
    return reject('unavailable');
  }

  return streamTurn({
    deps,
    model,
    sessionId,
    isNew: input.turnstileToken !== undefined,
    locale: input.locale,
    message,
    page: input.page,
    timeZone:
      (input.timeZone && canonicalZone(input.timeZone)) ||
      DEFAULT_ZONE[input.locale],
    remaining: CHAT_LIMITS.messages - used,
    reserved,
    hostname,
  });
}
