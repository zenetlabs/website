import { type ModelMessage, type ToolSet, tool } from 'ai';
import { z } from 'zod';
import type { Proposal } from '@/lib/chat-events';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { type NavigateSection, resolveNavigation } from '@/lib/navigate';
import type { PageId, SiteFlags } from '@/lib/page-registry';
import { zonedDay } from '@/lib/slot-format';
import { bookingInputSchema } from '@/server/booking-schema';
import { errorName } from '@/server/responses';
import { navigateInput } from '@/server/tools/navigate';
import { offeredTools } from '@/server/tools/registry';
import type {
  ClientTool,
  RunResult,
  ServerTool,
  Tool,
  ToolContext,
} from '@/server/tools/types';

const SLOTS_FOR_MODEL = 8;
const SLOTS_PER_DAY = 3;

const CHAT_BOOK_DESCRIPTION: Record<Locale, string> = {
  en: 'Proposes a free 30-minute call at a slot returned by check_availability. Nothing is booked yet: the visitor fills in their details in a card, then gets an email and books the call only by pressing Confirm in it.',
  es: 'Propone una llamada gratuita de 30 minutos en una hora devuelta por check_availability. Todavía no se reserva nada: el visitante completa sus datos en una tarjeta, recibe un correo y la llamada solo queda reservada cuando pulsa Confirmar en él.',
};

export type NavigateEvent = {
  page: PageId;
  section?: NavigateSection;
  href: string;
};

export type ChatToolContext = {
  locale: Locale;
  timeZone: string;
  // The days the visitor's message names; they win over the model's from/to.
  // `days` when they are apart ("¿lunes o martes?"): each is looked at alone.
  requestedDays?: {
    from: string;
    to: string;
    days?: readonly string[];
  } | null;
  site: SiteFlags;
  run: ToolContext;
  onNavigate: (event: NavigateEvent) => void;
  onProposal: (proposal: Proposal) => void;
};

export function chatToolNames(site: SiteFlags): string[] {
  return offeredTools(site).map((def) => def.name);
}

// The model never chooses the language or the time zone: the page and the
// browser do, and the schema it sees has neither.
function modelInput(schema: z.ZodType): z.ZodType {
  if (!(schema instanceof z.ZodObject)) return schema;
  const view =
    'locale' in schema.shape ? schema.omit({ locale: true }) : schema;
  return 'timeZone' in view.shape ? view.omit({ timeZone: true }) : view;
}

const slotsView = z
  .object({
    timeZone: z.string(),
    slots: z.array(z.object({ start: z.string() }).loose()),
  })
  .loose();

function dayOf(start: string, zone: string): string {
  const instant = Date.parse(start);
  return Number.isNaN(instant) ? start : zonedDay(instant, zone);
}

// At most eight slots, three a day first, so the model sees several days and
// not only the first morning.
function spreadSlots<T extends { start: string }>(
  slots: readonly T[],
  zone: string,
): T[] {
  const picked = new Set<T>();
  const perDay = new Map<string, number>();
  for (const slot of slots) {
    if (picked.size >= SLOTS_FOR_MODEL) break;
    const day = dayOf(slot.start, zone);
    const count = perDay.get(day) ?? 0;
    if (count < SLOTS_PER_DAY) {
      perDay.set(day, count + 1);
      picked.add(slot);
    }
  }
  for (const slot of slots) {
    if (picked.size >= SLOTS_FOR_MODEL) break;
    picked.add(slot);
  }
  return slots.filter((slot) => picked.has(slot));
}

// What the model reads: no URLs (the page links are the navigate button's job)
// and a spread of at most eight slots.
function modelView(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(modelView);
  if (!isRecord(value)) return value;
  const slots = slotsView.safeParse(value);
  const base = slots.success
    ? {
        ...slots.data,
        slots: spreadSlots(slots.data.slots, slots.data.timeZone),
      }
    : value;
  return Object.fromEntries(
    Object.entries(base)
      .filter(([key]) => !/url$/i.test(key))
      .map(([key, entry]) => [key, modelView(entry)]),
  );
}

const offeredSchema = z.object({
  type: z.literal('tool-result'),
  toolName: z.literal('check_availability'),
  output: z.object({
    type: z.literal('json'),
    value: z
      .object({ slots: z.array(z.object({ start: z.string() })) })
      .loose(),
  }),
});

function offeredSlots(messages: readonly ModelMessage[]): number[] {
  return messages.flatMap((message) => {
    if (message.role !== 'tool') return [];
    return message.content.flatMap((part) => {
      const parsed = offeredSchema.safeParse(part);
      return parsed.success
        ? parsed.data.output.value.slots.map((slot) => Date.parse(slot.start))
        : [];
    });
  });
}

const freeSlotsSchema = z.object({
  status: z.literal('ok'),
  slots: z.array(z.unknown()),
});

function isEmptyRange(raw: Record<string, unknown>, result: unknown): boolean {
  const parsed = freeSlotsSchema.safeParse(result);
  return (
    ('from' in raw || 'to' in raw) &&
    parsed.success &&
    parsed.data.slots.length === 0
  );
}

// A day with nothing free answers with the nearest free slots instead, marked
// so the model says the asked day is full rather than offering it.
const okSlotsSchema = z
  .object({
    status: z.literal('ok'),
    slots: z.array(z.unknown()),
    more: z.boolean(),
  })
  .loose();

// Days apart ("¿lunes o martes?") are looked at one by one, so the second
// is not cut off by the first's slots, and answered as one result.
async function eachDay(
  def: ServerTool,
  raw: Record<string, unknown>,
  days: readonly string[],
  ctx: ChatToolContext,
): Promise<RunResult> {
  const runs = await Promise.all(
    days.map((day) => def.run({ ...raw, from: day, to: day }, ctx.run)),
  );
  const found = runs.flatMap((run) => {
    const parsed = run.ok ? okSlotsSchema.safeParse(run.result) : null;
    return parsed?.success ? [parsed.data] : [];
  });
  const [first] = found;
  if (first === undefined) return runs[0] ?? { ok: true, result: {} };
  return {
    ok: true,
    result: {
      ...first,
      slots: found.flatMap((result) => result.slots),
      more: found.some((result) => result.more),
    },
  };
}

async function availabilityFor(
  def: ServerTool,
  raw: Record<string, unknown>,
  ctx: ChatToolContext,
): Promise<RunResult> {
  const days = ctx.requestedDays?.days ?? [];
  const asked =
    days.length > 1
      ? await eachDay(def, raw, days, ctx)
      : await def.run(raw, ctx.run);
  if (!asked.ok || !isEmptyRange(raw, asked.result)) return asked;
  const { locale, timeZone } = raw;
  const nearest = await def.run({ locale, timeZone }, ctx.run);
  return nearest.ok && isRecord(nearest.result)
    ? {
        ok: true,
        result: { ...nearest.result, requestedDays: 'no_free_times' },
      }
    : asked;
}

async function runRegistryTool(
  def: ServerTool,
  input: unknown,
  ctx: ChatToolContext,
): Promise<unknown> {
  const raw = {
    ...(isRecord(input) ? input : {}),
    locale: ctx.locale,
    ...(def.name === 'check_availability' && ctx.requestedDays
      ? {
          timeZone: ctx.timeZone,
          from: ctx.requestedDays.from,
          to: ctx.requestedDays.to,
        }
      : def.name === 'check_availability'
        ? { timeZone: ctx.timeZone }
        : {}),
  };
  try {
    const outcome =
      def.name === 'check_availability'
        ? await availabilityFor(def, raw, ctx)
        : await def.run(raw, ctx.run);
    return outcome.ok ? modelView(outcome.result) : { status: 'invalid_input' };
  } catch (error) {
    console.error('chat: tool failed', {
      tool: def.name,
      code: errorName(error),
    });
    return { status: 'unavailable' };
  }
}

// A chat tool before it meets the AI SDK: the model sees `description` and
// `inputSchema`; `execute` gets the call's input and the messages so far.
export type ChatTool = {
  description: string;
  inputSchema: z.ZodType;
  execute: (
    input: unknown,
    messages: readonly ModelMessage[],
  ) => unknown | Promise<unknown>;
};

const bookingProposal = bookingInputSchema.pick({ slot: true, topic: true });

function bookingTool(ctx: ChatToolContext): ChatTool {
  return {
    description: CHAT_BOOK_DESCRIPTION[ctx.locale],
    inputSchema: bookingProposal,
    execute: (input, messages) => {
      const parsed = bookingProposal.safeParse(input);
      if (!parsed.success) return { status: 'invalid_input' };
      const wanted = Date.parse(parsed.data.slot);
      if (!offeredSlots(messages).includes(wanted)) {
        return { status: 'invalid_slot' };
      }
      ctx.onProposal({
        slot: new Date(wanted).toISOString(),
        topic: parsed.data.topic,
      });
      return { status: 'awaiting_confirmation' };
    },
  };
}

function navigateTool(def: ClientTool, ctx: ChatToolContext): ChatTool {
  return {
    description: def.description[ctx.locale],
    inputSchema: navigateInput.omit({ locale: true }),
    execute: (input) => {
      const parsed = navigateInput.safeParse({
        ...(isRecord(input) ? input : {}),
        locale: ctx.locale,
      });
      if (!parsed.success) return { ok: false };
      const { page, section } = parsed.data;
      const href = resolveNavigation({ page, section }, ctx.locale, ctx.site);
      if (href === null) return { ok: false };
      ctx.onNavigate({ page, ...(section ? { section } : {}), href });
      return { ok: true };
    },
  };
}

function toolFor(def: Tool, ctx: ChatToolContext): ChatTool {
  if (def.name === 'book_meeting') return bookingTool(ctx);
  if (def.clientOnly) return navigateTool(def, ctx);
  return {
    description: def.description[ctx.locale],
    inputSchema: modelInput(def.input),
    execute: (input) => runRegistryTool(def, input, ctx),
  };
}

export function chatTools(ctx: ChatToolContext): Record<string, ChatTool> {
  return Object.fromEntries(
    offeredTools(ctx.site).map((def) => [def.name, toolFor(def, ctx)]),
  );
}

export function aiTools(tools: Record<string, ChatTool>): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, chat]) => [
      name,
      tool({
        description: chat.description,
        inputSchema: chat.inputSchema,
        execute: (input, { messages }) => chat.execute(input, messages),
      }),
    ]),
  );
}
