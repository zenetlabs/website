import { useCallback, useSyncExternalStore } from 'react';
import type { PageAvailability } from '@/lib/booking-client';
import type { Locale } from '@/lib/i18n';
import type { ReadySlots } from '@/lib/next-slots-load';
import { pagePath } from '@/lib/page-registry';
import { MINUTE_MS } from '@/lib/time';

export type NextSlots =
  | { status: 'waiting' }
  | { status: 'failed' }
  | ReadySlots;

const WAITING: NextSlots = { status: 'waiting' };
const FAILED: NextSlots = { status: 'failed' };

// Times older than this are fetched again the next time a rail subscribes
// (a page left open, or a return to home); the shown times stay until then.
const FRESH_MS = 5 * MINUTE_MS;

const states = new Map<Locale, NextSlots>();
const started = new Map<Locale, number>();
const listeners = new Set<() => void>();
let availability: { at: number; slots: Promise<PageAvailability> } | null =
  null;

function emit(): void {
  for (const listener of listeners) listener();
}

function set(locale: Locale, next: NextSlots): void {
  states.set(locale, next);
  emit();
}

function afterLoadAndIdle(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => resolve(), { timeout: 2000 });
      } else setTimeout(resolve, 200);
    };
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  });
}

// One attempt per subscription window: a failure shows the link to all times,
// never a retry loop.
async function load(locale: Locale): Promise<void> {
  try {
    await afterLoadAndIdle();
    const loader = await import('@/lib/next-slots-load');
    if (availability === null || Date.now() - availability.at >= FRESH_MS) {
      availability = { at: Date.now(), slots: loader.loadAvailability() };
    }
    const ready = await loader.nextSlots(await availability.slots, locale);
    set(locale, ready ?? FAILED);
  } catch {
    set(locale, FAILED);
  }
}

function start(locale: Locale): void {
  const at = started.get(locale);
  if (at !== undefined && Date.now() - at < FRESH_MS) return;
  started.set(locale, Date.now());
  void load(locale);
}

function waiting(): NextSlots {
  return WAITING;
}

export function useNextSlots(locale: Locale): NextSlots {
  const subscribe = useCallback(
    (listener: () => void) => {
      listeners.add(listener);
      start(locale);
      return () => {
        listeners.delete(listener);
      };
    },
    [locale],
  );
  const snapshot = useCallback(() => states.get(locale) ?? WAITING, [locale]);
  return useSyncExternalStore(subscribe, snapshot, waiting);
}

// A desk chip's link: /book with the slot preselected.
export function slotHref(locale: Locale, start: number): string {
  return `${pagePath(locale, 'book')}?slot=${start}`;
}
