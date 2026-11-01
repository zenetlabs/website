import type { z } from 'zod';
import type { Locale } from '@/lib/i18n';
import type { Attribution } from '@/lib/lead-schema';
import type { BookingDeps } from '@/server/booking';
import type { Channel } from '@/server/booking-schema';
import { type Issue, issuesOf } from '@/server/request';

export type ToolContext = {
  now: number;
  channel: Channel;
  hostname: string;
  consentAt: number | null;
  attribution: Attribution | null;
  deps: BookingDeps;
};

export type RunResult =
  | { ok: true; result: unknown }
  | { ok: false; issues: Issue[] };

type Shared = {
  name: string;
  description: Record<Locale, string>;
  input: z.ZodType;
  output: z.ZodType;
};

export type ServerTool = Shared & {
  clientOnly: false;
  readOnly: boolean;
  run: (raw: unknown, ctx: ToolContext) => Promise<RunResult>;
};

export type ClientTool = Shared & { clientOnly: true; readOnly: true };

export type Tool = ServerTool | ClientTool;

export function defineTool<I extends z.ZodType, O extends z.ZodType>(def: {
  name: string;
  description: Record<Locale, string>;
  input: I;
  output: O;
  readOnly: boolean;
  execute: (input: z.output<I>, ctx: ToolContext) => Promise<z.input<O>>;
}): ServerTool {
  return {
    name: def.name,
    description: def.description,
    input: def.input,
    output: def.output,
    readOnly: def.readOnly,
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
}): ClientTool {
  return { ...def, clientOnly: true, readOnly: true };
}
