import { type ModelMessage, type ToolSet, tool } from 'ai';
import { z } from 'zod';
import type { Proposal } from '@/lib/chat-events';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { type NavigateSection, resolveNavigation } from '@/lib/navigate';
import type { PageId, SiteFlags } from '@/lib/page-registry';
import { formatSlotLabel, zonedDay } from '@/lib/slot-format';
import { type Interval, zonedIso } from '@/lib/slots';
import { bookingInputSchema } from '@/server/booking-schema';
import { slotsOf, toolSlots } from '@/server/chat/slot-guard';
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
  en: 'Proposes a free 30-minute call at a slot returned by check_availability. Nothing is booked yet: a card below the reply shows the time, the visitor fills in their name and email there and sends it, then gets an email with a link, and the call is booked when they click it.',
  es: 'Propone una llamada gratuita de 30 minutos en una hora devuelta por check_availability. Todavía no se reserva nada: una tarjeta bajo la respuesta muestra la hora, el visitante rellena ahí su nombre y su email y la envía, recibe un correo con un enlace y la llamada queda reservada cuando lo pulsa.',
};

export type NavigateEvent = {
  page: PageId;
  section?: NavigateSection;
  href: string;
};

export type ChatToolContext = {
  locale: Locale;
  timeZone: string;
  // The language of the reply, when it differs from the page's.
  language?: Locale;
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

// What a book_meeting for a time that was never offered answers, by case, in
// the reply language: that day's free times, the nearest ones when the day is
// full, or an honest "the calendar could not be checked".
const MISSED_NOTE: Record<
  Locale,
  { free: string; full: string; unknown: string; none: string }
> = {
  en: {
    free: 'That time is not free; the free times for that day are in slots.',
    full: 'That day is full; the nearest free times are in slots.',
    unknown:
      'That time is not one of the offered times, and the calendar could not be checked just now.',
    none: 'That time is not free, and there are no other free times to offer right now.',
  },
  es: {
    free: 'Esa hora no está libre; las horas libres de ese día están en slots.',
    full: 'Ese día está completo; las horas libres más cercanas están en slots.',
    unknown:
      'Esa hora no es una de las ofrecidas y ahora mismo no se ha podido consultar la agenda.',
    none: 'Esa hora no está libre y ahora mismo no hay otras horas libres que ofrecer.',
  },
};

const RECOVERY_SLOTS = 8;
const OFFSET = /(?:Z|[+-]\d\d(?::?\d\d)?)$/i;

// The instants the model may have meant: the one it wrote and the classic
// misread, an offered UTC wall clock sent with the visitor's offset (09:00Z
// sent as 09:00+08:00), read back as UTC.
function meantInstants(slot: string, wanted: number): number[] {
  const misread = Date.parse(slot.replace(OFFSET, 'Z'));
  return Number.isNaN(misread) || misread === wanted
    ? [wanted]
    : [wanted, misread];
}

// The free times nearest to what the model meant, in time order.
function nearestTo(
  slots: readonly Interval[],
  meant: readonly number[],
): Interval[] {
  const distance = (slot: Interval) =>
    Math.min(...meant.map((instant) => Math.abs(slot.start - instant)));
  const unique = [...new Map(slots.map((slot) => [slot.start, slot])).values()];
  return unique
    .sort((a, b) => distance(a) - distance(b))
    .slice(0, RECOVERY_SLOTS)
    .sort((a, b) => a.start - b.start);
}

function freeTimes(
  note: string,
  slots: readonly Interval[],
  meant: readonly number[],
  ctx: ChatToolContext,
) {
  const zone = ctx.timeZone;
  return {
    status: 'invalid_slot',
    note,
    timeZone: zone,
    slots: nearestTo(slots, meant).map(({ start, end }) => ({
      start: zonedIso(start, zone),
      end: zonedIso(end, zone),
      label: formatSlotLabel(ctx.locale, start, zone),
    })),
  };
}

// The free slots of one check_availability run, or null when it could not
// look (unavailable, invalid).
function freeOf(run: RunResult): Interval[] | null {
  return run.ok && freeSlotsSchema.safeParse(run.result).success
    ? slotsOf(run.result)
    : null;
}

type Missed = { status: 'proposed' } | Record<string, unknown>;

// A start that was never offered (often an offered UTC hour read as local
// time). The calendar is always asked (the busy cache makes it cheap), for
// the visitor-zone days of what the model meant: a time that is in fact free
// is proposed (the card, checkSlot and the email confirmation still apply),
// else the free times of those days nearest to it, else the nearest free
// times. A calendar that cannot be read says so and lists nothing, not even
// times shown earlier, which it can no longer vouch for: the model offers the
// contact path honestly.
async function notOffered(
  slot: string,
  wanted: number,
  def: ServerTool | undefined,
  ctx: ChatToolContext,
): Promise<Missed> {
  const notes = MISSED_NOTE[ctx.language ?? ctx.locale];
  const unknown = {
    status: 'invalid_slot',
    calendar: 'unavailable',
    note: notes.unknown,
  };
  const meant = meantInstants(slot, wanted);
  const days = new Set(meant.map((instant) => zonedDay(instant, ctx.timeZone)));
  if (def === undefined) return unknown;
  const { locale, timeZone } = ctx;
  try {
    const runs = await Promise.all(
      [...days].map((day) =>
        def.run({ locale, timeZone, from: day, to: day }, ctx.run),
      ),
    );
    const found = runs.map(freeOf);
    if (found.every((free) => free === null)) return unknown;
    const fresh = found.flatMap((free) => free ?? []);
    if (fresh.some((free) => free.start === wanted))
      return { status: 'proposed' };
    if (fresh.length > 0) return freeTimes(notes.free, fresh, meant, ctx);
    const nearest = freeOf(await def.run({ locale, timeZone }, ctx.run));
    if (nearest === null) return unknown;
    if (nearest.length === 0) {
      return {
        status: 'invalid_slot',
        calendar: 'no_free_times',
        note: notes.none,
      };
    }
    return {
      ...freeTimes(notes.full, nearest, meant, ctx),
      requestedDays: 'no_free_times',
    };
  } catch (error) {
    console.error('chat: tool failed', {
      tool: def.name,
      code: errorName(error),
    });
    return unknown;
  }
}

const proposedSchema = z.object({
  type: z.literal('tool-result'),
  toolName: z.literal('book_meeting'),
  output: z.object({
    type: z.literal('json'),
    value: z.object({ status: z.literal('awaiting_confirmation') }).loose(),
  }),
});

// Whether a booking card was proposed earlier in the conversation.
export function proposalMade(messages: readonly ModelMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === 'tool' &&
      message.content.some((part) => proposedSchema.safeParse(part).success),
  );
}

function bookingTool(
  ctx: ChatToolContext,
  availability: ServerTool | undefined,
): ChatTool {
  const propose = (wanted: number, topic: string) => {
    ctx.onProposal({ slot: new Date(wanted).toISOString(), topic });
    return { status: 'awaiting_confirmation' };
  };
  return {
    description: CHAT_BOOK_DESCRIPTION[ctx.locale],
    inputSchema: bookingProposal,
    execute: async (input, messages) => {
      const parsed = bookingProposal.safeParse(input);
      if (!parsed.success) return { status: 'invalid_input' };
      const { slot, topic } = parsed.data;
      const wanted = Date.parse(slot);
      const offered = toolSlots(messages).map((shown) => shown.start);
      if (offered.includes(wanted)) return propose(wanted, topic);
      const missed = await notOffered(slot, wanted, availability, ctx);
      return missed.status === 'proposed' ? propose(wanted, topic) : missed;
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

function toolFor(
  def: Tool,
  ctx: ChatToolContext,
  availability: ServerTool | undefined,
): ChatTool {
  if (def.name === 'book_meeting') return bookingTool(ctx, availability);
  if (def.clientOnly) return navigateTool(def, ctx);
  return {
    description: def.description[ctx.locale],
    inputSchema: modelInput(def.input),
    execute: (input) => runRegistryTool(def, input, ctx),
  };
}

export function chatTools(ctx: ChatToolContext): Record<string, ChatTool> {
  const defs = offeredTools(ctx.site);
  const availability = defs.find(
    (def): def is ServerTool =>
      def.name === 'check_availability' && !def.clientOnly,
  );
  return Object.fromEntries(
    defs.map((def) => [def.name, toolFor(def, ctx, availability)]),
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
