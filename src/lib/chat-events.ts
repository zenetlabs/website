import type { GuardError } from '@/lib/guard-error';
import type { Locale } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import type { NavigateSection } from '@/lib/navigate';
import { PAGE_IDS, type PageId } from '@/lib/page-registry';

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

export type Proposal = { slot: string; topic: string };

const MAX_SLOTS = 8;

// A zone the browser can format times in (an unknown one throws).
function isUsableZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

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
  // The free slots check_availability returned this turn, as epoch ms.
  | { t: 'slots'; zone: string; starts: number[] }
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
    case 'slots':
      return (
        typeof value.zone === 'string' &&
        isUsableZone(value.zone) &&
        Array.isArray(value.starts) &&
        value.starts.length <= MAX_SLOTS &&
        value.starts.every(Number.isSafeInteger)
      );
    case 'error':
      return value.code === 'unavailable';
    case 'done':
      return typeof value.remaining === 'number';
    default:
      return false;
  }
}
