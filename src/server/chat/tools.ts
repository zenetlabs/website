import { type ModelMessage, type ToolSet, tool } from 'ai';
import { z } from 'zod';
import type { Proposal } from '@/lib/chat-events';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { type NavigateSection, resolveNavigation } from '@/lib/navigate';
import { isPublished, type PageId, type SiteFlags } from '@/lib/page-registry';
import { bookingInputSchema } from '@/server/booking-schema';
import { errorName } from '@/server/responses';
import { navigateInput } from '@/server/tools/navigate';
import { enabledTools } from '@/server/tools/registry';
import type {
  ClientTool,
  ServerTool,
  Tool,
  ToolContext,
} from '@/server/tools/types';

const SLOTS_FOR_MODEL = 8;

const CHAT_BOOK_DESCRIPTION: Record<Locale, string> = {
  en: 'Proposes a free 30-minute call at a slot returned by check_availability. Nothing is booked yet: the visitor fills in their details and confirms in a card.',
  es: 'Propone una llamada gratuita de 30 minutos en una hora devuelta por check_availability. Todavía no se reserva nada: el visitante completa sus datos y confirma en una tarjeta.',
};

export type NavigateEvent = {
  page: PageId;
  section?: NavigateSection;
  href: string;
};

export type ChatToolContext = {
  locale: Locale;
  timeZone: string;
  site: SiteFlags;
  run: ToolContext;
  onNavigate: (event: NavigateEvent) => void;
  onProposal: (proposal: Proposal) => void;
};

// What the model may call: the enabled registry tools, minus the estimate while
// the calculator is dark. Dark features are never offered.
function offered(site: SiteFlags): readonly Tool[] {
  return enabledTools(site).filter(
    (def) => def.name !== 'estimate_project' || isPublished('calculator', site),
  );
}

export function chatToolNames(site: SiteFlags): string[] {
  return offered(site).map((def) => def.name);
}

// The model never chooses the language: the page does, and the schema it sees has no locale.
function modelInput(schema: z.ZodType): z.ZodType {
  return schema instanceof z.ZodObject && 'locale' in schema.shape
    ? schema.omit({ locale: true })
    : schema;
}

const slotsView = z.object({ slots: z.array(z.unknown()) }).loose();

// What the model reads: no URLs (the page links are the navigate button's job)
// and at most eight slots.
function modelView(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(modelView);
  if (!isRecord(value)) return value;
  const slots = slotsView.safeParse(value);
  const base = slots.success
    ? { ...slots.data, slots: slots.data.slots.slice(0, SLOTS_FOR_MODEL) }
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

async function runRegistryTool(
  def: ServerTool,
  input: unknown,
  ctx: ChatToolContext,
): Promise<unknown> {
  const raw = {
    ...(isRecord(input) ? input : {}),
    locale: ctx.locale,
    ...(def.name === 'check_availability' &&
    !(isRecord(input) && 'timeZone' in input)
      ? { timeZone: ctx.timeZone }
      : {}),
  };
  try {
    const outcome = await def.run(raw, ctx.run);
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
    offered(ctx.site).map((def) => [def.name, toolFor(def, ctx)]),
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
