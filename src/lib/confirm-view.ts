import { isRecord } from '@/lib/is-record';
import type { LeadMethod } from '@/lib/track';

export const CONFIRM_STATES = [
  'pending',
  'confirming',
  'confirmed',
  'taken',
  'expired',
  'failed',
  'unknown',
  'cancelled',
  'unavailable',
  'invalid',
] as const;

export type ConfirmState = (typeof CONFIRM_STATES)[number];

// What the confirm page shows for a link. Never the name, company or topic:
// only the slot, the masked address and how long the link works.
export type ConfirmView =
  | { state: 'invalid' }
  | {
      state: Exclude<ConfirmState, 'invalid'>;
      start: number;
      end: number;
      timeZone: string | null;
      masked: string;
      expiresAt: number;
      method: LeadMethod;
    };

export type ConfirmOutcome = 'taken' | 'unavailable' | 'booked';

const METHODS = ['booking', 'chat', 'webmcp', 'voice'] as const;

function stateOf(value: unknown): ConfirmState | null {
  return CONFIRM_STATES.find((state) => state === value) ?? null;
}

export function confirmViewOf(body: unknown): ConfirmView {
  if (!isRecord(body)) return { state: 'invalid' };
  const state = stateOf(body.state);
  const method = METHODS.find((value) => value === body.method);
  const { start, end, expiresAt, masked, timeZone } = body;
  if (
    state === null ||
    state === 'invalid' ||
    method === undefined ||
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    typeof expiresAt !== 'number' ||
    typeof masked !== 'string' ||
    !(timeZone === null || typeof timeZone === 'string')
  ) {
    return { state: 'invalid' };
  }
  return { state, start, end, expiresAt, masked, timeZone, method };
}

export function outcomeOf(value: unknown): ConfirmOutcome | null {
  return value === 'taken' || value === 'unavailable' || value === 'booked'
    ? value
    : null;
}

export async function fetchConfirmation(
  token: string,
  outcome: ConfirmOutcome | null,
): Promise<ConfirmView> {
  const query = new URLSearchParams({ confirm: token });
  if (outcome) query.set('outcome', outcome);
  try {
    const response = await fetch(`/api/book/confirm?${query}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return { state: 'invalid' };
    return confirmViewOf(await response.json().catch(() => undefined));
  } catch {
    return { state: 'invalid' };
  }
}
