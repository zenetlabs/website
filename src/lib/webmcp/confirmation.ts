import type { WebMcpCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { noop } from '@/lib/time';

export type ToolEnvelope =
  | { ok: true; result: unknown }
  | { ok: false; error: string; issues?: unknown };

export function isEnvelope(value: unknown): value is ToolEnvelope {
  return isRecord(value) && typeof value.ok === 'boolean';
}

export type BookingProposal = {
  slot: string;
  topic: string;
  name: string;
  email: string;
  company: string;
  timeZone: string;
};

export type BookingRequest = {
  proposal: BookingProposal;
  label: string;
  locale: Locale;
  copy: WebMcpCopy['dialog'];
  // Called as a submit starts; false once the call is answered, aborted or closed.
  begin: () => boolean;
  isHeld: () => boolean;
  answered: () => boolean;
  // The submit is over: a booking answers the agent with it, anything else
  // answers with `envelope`, or with `cancelled` if the agent aborted meanwhile.
  finish: (envelope: ToolEnvelope, booked: boolean) => void;
  // The submit is over and the visitor may try again (unless the agent aborted).
  retry: () => void;
  // Closes the dialog; a no-op while a submit is in flight.
  dismiss: () => void;
};

// Puts the request on screen and returns what takes it down again.
export type MountDialog = (request: BookingRequest) => () => void;

const DECLINED: ToolEnvelope = { ok: true, result: { status: 'declined' } };
const CANCELLED: ToolEnvelope = { ok: true, result: { status: 'cancelled' } };
const UNAVAILABLE: ToolEnvelope = { ok: false, error: 'unavailable' };

// The latest request. Once it is answered it only stays on screen for the
// visitor, and the next proposal closes it.
let current: BookingRequest | null = null;

export function hasPendingBooking(): boolean {
  return current !== null && !current.answered();
}

// Resolves with what the agent is told. Null means a confirmation is still open.
export function openConfirmation(input: {
  proposal: BookingProposal;
  label: string;
  locale: Locale;
  copy: WebMcpCopy['dialog'];
  signal: AbortSignal | undefined;
  mount: MountDialog;
}): Promise<ToolEnvelope> | null {
  if (hasPendingBooking()) return null;
  current?.dismiss();
  if (input.signal?.aborted) return Promise.resolve(CANCELLED);
  let resolve: (envelope: ToolEnvelope) => void = noop;
  const promise = new Promise<ToolEnvelope>((settle) => {
    resolve = settle;
  });
  let answered = false;
  let held = false;
  let aborted = false;
  let closed = false;
  let unmount: () => void = noop;
  function answer(envelope: ToolEnvelope) {
    if (answered) return;
    answered = true;
    held = false;
    resolve(envelope);
  }
  function cancel() {
    answer(CANCELLED);
    request.dismiss();
  }
  const request: BookingRequest = {
    proposal: input.proposal,
    label: input.label,
    locale: input.locale,
    copy: input.copy,
    begin: () => {
      if (answered || aborted || closed) return false;
      held = true;
      return true;
    },
    isHeld: () => held,
    answered: () => answered,
    finish: (envelope, booked) => {
      held = false;
      if (aborted && !booked) cancel();
      else answer(envelope);
    },
    retry: () => {
      held = false;
      if (aborted) cancel();
    },
    dismiss: () => {
      if (held) return;
      answer(DECLINED);
      closed = true;
      input.signal?.removeEventListener('abort', onAbort);
      if (current !== request) return;
      current = null;
      unmount();
    },
  };
  // An abort during a submit is remembered and applied when the submit ends.
  function onAbort() {
    aborted = true;
    if (!answered && !held) cancel();
  }
  input.signal?.addEventListener('abort', onAbort, { once: true });
  current = request;
  try {
    unmount = input.mount(request);
  } catch {
    closed = true;
    input.signal?.removeEventListener('abort', onAbort);
    current = null;
    return Promise.resolve(UNAVAILABLE);
  }
  return promise;
}
