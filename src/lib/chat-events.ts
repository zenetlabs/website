import type { GuardError } from '@/lib/guard-error';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import type { NavigateSection } from '@/lib/navigate';
import { PAGE_IDS, type PageId } from '@/lib/page-registry';
import { HOUR_MS } from '@/lib/time';

export type ChatError = GuardError | 'session' | 'session-full' | 'budget';

// Written out for the browser, which must not import the server module; the
// Record type fails to compile if a ChatError is missing.
const CHAT_ERRORS: Record<ChatError, true> = {
  origin: true,
  unsupported: true,
  rate: true,
  'too-large': true,
  invalid: true,
  captcha: true,
  session: true,
  'session-full': true,
  budget: true,
  unavailable: true,
};

export const CHAT_LIMITS = {
  messages: 20,
  messageChars: 1000,
  idleMs: 2 * HOUR_MS,
  absoluteMs: 24 * HOUR_MS,
} as const;

export type Proposal = { slot: string; topic: string };

export type ChatEvent =
  | { t: 'session'; id: string }
  | { t: 'tool'; name: string }
  | { t: 'text'; v: string }
  | {
      t: 'navigate';
      page: PageId;
      section?: NavigateSection;
      href: string;
    }
  | { t: 'confirm_booking'; proposal: Proposal }
  | { t: 'error'; code: 'unavailable' }
  | { t: 'done'; remaining: number };

export type ChatRequestBody = {
  locale: Locale;
  message: string;
  page: string;
  timeZone: string;
} & ({ sessionId: string } | { turnstileToken: string });

export type ChatFailure = { ok: false; error: ChatError };

export function isChatFailure(value: unknown): value is ChatFailure {
  return (
    isRecord(value) &&
    value.ok === false &&
    typeof value.error === 'string' &&
    Object.hasOwn(CHAT_ERRORS, value.error)
  );
}

export function isChatEvent(value: unknown): value is ChatEvent {
  if (!isRecord(value)) return false;
  switch (value.t) {
    case 'session':
      return typeof value.id === 'string';
    case 'tool':
      return typeof value.name === 'string';
    case 'text':
      return typeof value.v === 'string';
    case 'navigate':
      return (
        typeof value.href === 'string' &&
        PAGE_IDS.some((page) => page === value.page)
      );
    case 'confirm_booking':
      return (
        isRecord(value.proposal) &&
        typeof value.proposal.slot === 'string' &&
        typeof value.proposal.topic === 'string'
      );
    case 'error':
      return value.code === 'unavailable';
    case 'done':
      return typeof value.remaining === 'number';
    default:
      return false;
  }
}
