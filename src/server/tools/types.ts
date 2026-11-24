import type { z } from 'zod';
import type { Surface } from '@/lib/booking-surfaces';
import type { Locale } from '@/lib/i18n';
import type { Attribution } from '@/lib/lead-schema';
import { isLiveHost } from '@/lib/redirects';
import type { BookingDeps } from '@/server/booking';
import type { Channel, VoiceRef } from '@/server/booking-schema';
import { type Issue, issuesOf } from '@/server/request';

export type ToolContext = {
  now: number;
  channel: Channel;
  hostname: string;
  consentAt: number | null;
  attribution: Attribution | null;
  chatSessionId: string | null;
  // Set on calls from an ElevenLabs agent: the session minted after Turnstile.
  voice?: VoiceRef;
  // The session was minted on a preview or local host.
  testSession?: boolean;
  // A booking's own: where it came from, the origin its links point to, and the
  // caller's IP for the per-IP cap (none for voice, whose IP is ElevenLabs').
  surface?: Surface | 'voice';
  origin?: string;
  ip?: { address: string; secret: string } | null;
  deps: BookingDeps;
};

// A preview or local host, or a call whose session was minted on one.
export function isTestContext(
  ctx: Pick<ToolContext, 'hostname' | 'testSession'>,
): boolean {
  return !isLiveHost(ctx.hostname) || ctx.testSession === true;
}

export type RunResult =
  | { ok: true; result: unknown }
  | { ok: false; issues: Issue[] };

export const AGENT_SURFACES = ['webmcp', 'chat', 'voice'] as const;
export type AgentSurface = (typeof AGENT_SURFACES)[number];

type Shared = {
  name: string;
  description: Record<Locale, string>;
  input: z.ZodType;
  output: z.ZodType;
  // Who is offered the tool; every surface unless the definition says so.
  surfaces: readonly AgentSurface[];
};

export type ServerTool = Shared & {
  clientOnly: false;
  readOnly: boolean;
  // What a call charges the tools limiter (default 1), in one place.
  cost: number;
  run: (raw: unknown, ctx: ToolContext) => Promise<RunResult>;
};

// A tool the visitor's browser runs: `opens` says what it puts on screen, a
// page or the contact form with a draft in it. Either ends a chat turn once
// the reply is written.
export type ClientTool = Shared & {
  clientOnly: true;
  readOnly: true;
  opens: 'page' | 'contactForm';
};

export type Tool = ServerTool | ClientTool;

export function defineTool<I extends z.ZodType, O extends z.ZodType>(def: {
  name: string;
  description: Record<Locale, string>;
  input: I;
  output: O;
  readOnly: boolean;
  cost?: number;
  surfaces?: readonly AgentSurface[];
  execute: (input: z.output<I>, ctx: ToolContext) => Promise<z.input<O>>;
}): ServerTool {
  return {
    name: def.name,
    description: def.description,
    input: def.input,
    output: def.output,
    readOnly: def.readOnly,
    cost: def.cost ?? 1,
    surfaces: def.surfaces ?? AGENT_SURFACES,
    clientOnly: false,
    async run(raw, ctx) {
      const parsed = def.input.safeParse(raw);
      if (!parsed.success) return { ok: false, issues: issuesOf(parsed.error) };
      return { ok: true, result: await def.execute(parsed.data, ctx) };
    },
  };
}

export function defineClientTool(def: {
  name: string;
  description: Record<Locale, string>;
  input: z.ZodType;
  output: z.ZodType;
  opens: ClientTool['opens'];
  surfaces?: readonly AgentSurface[];
}): ClientTool {
  return {
    ...def,
    surfaces: def.surfaces ?? AGENT_SURFACES,
    clientOnly: true,
    readOnly: true,
  };
}
