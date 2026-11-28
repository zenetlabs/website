import { expect, type Page } from '@playwright/test';
import { z } from 'zod';
import { siteConfig } from '../site.config';
import { BOOKING_RULES } from '../src/content/booking-rules';
import type { ServiceId } from '../src/content/types';
import { answersQuery } from '../src/lib/calculator-answers';
import { decodeEntities, tidy } from '../src/lib/markdown';
import type { ServicePageId } from '../src/lib/page-registry';
import type { Slot } from '../src/lib/slots';
import { availableSlots } from '../src/server/booking-slots';
import { G5 } from '../test/calculator-fixtures';

export const OBSERVER = `
  window.__layoutShift = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__layoutShift += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

declare global {
  interface Window {
    __layoutShift?: number;
  }
}

export const SERVICES_HUB = { en: '/services', es: '/es/servicios' } as const;

export const SERVICE_PAIRS = {
  diagnostic: {
    en: '/services/automation-diagnostic',
    es: '/es/servicios/diagnostico-de-automatizacion',
    service: 'diagnostic',
  },
  automation: {
    en: '/services/ai-automation',
    es: '/es/servicios/automatizacion-de-procesos',
    service: 'integration',
  },
  integrations: {
    en: '/services/integrations',
    es: '/es/servicios/integraciones',
    service: 'integration',
  },
  agents: {
    en: '/services/ai-agents',
    es: '/es/servicios/agentes-de-ia',
    service: 'agent',
  },
  software: {
    en: '/services/custom-software',
    es: '/es/servicios/desarrollo-de-software-a-medida',
    service: 'web',
  },
  training: {
    en: '/services/ai-training',
    es: '/es/servicios/formacion-ia-equipos',
    service: 'training',
  },
  maintenance: {
    en: '/services/maintenance',
    es: '/es/servicios/mantenimiento',
    service: 'maintenance',
  },
} as const satisfies Record<
  ServicePageId,
  { en: string; es: string; service: ServiceId }
>;

export const HOLDED_PAGES = [
  '/es/servicios/integraciones/holded-prestashop',
  '/es/servicios/integraciones/holded-woocommerce',
  '/es/servicios/integraciones/holded-hubspot',
] as const;

export const VERIFACTU_PAGE = '/es/verifactu-integracion';
export const SECTOR_PAGE = '/es/sectores/agencias-de-viaje';
export const CASE_PAIR = { en: '/case-studies/viatsy', es: '/es/casos/viatsy' };
export const CASES_HUB = { en: '/case-studies', es: '/es/casos' } as const;
export const CONTACT_PAIR = { en: '/contact', es: '/es/contacto' } as const;

export const ES_ONLY_PAGES = [
  ...HOLDED_PAGES,
  VERIFACTU_PAGE,
  SECTOR_PAGE,
  '/es/aviso-legal',
] as const;

export const CALCULATOR_PAIR = {
  en: '/pricing/calculator',
  es: '/es/precios/calculadora',
} as const;

const SITE_FLAGS = siteConfig(
  process.env.PLAYWRIGHT_BASE_URL ? 'production' : undefined,
);

export const CALCULATOR_PUBLISHED = SITE_FLAGS.calculator.published;

const RESULT = answersQuery(G5);

export const CALCULATOR_RESULTS: readonly string[] = CALCULATOR_PUBLISHED
  ? [CALCULATOR_PAIR.en, CALCULATOR_PAIR.es].map((path) => `${path}?${RESULT}`)
  : [];

export const ASSISTANT_PUBLISHED = SITE_FLAGS.assistant.published;

export const VOICE_PUBLISHED = SITE_FLAGS.voice.published;

export const WEBMCP_PUBLISHED = SITE_FLAGS.webmcp.published;

export const BOOK_PAIR = { en: '/book', es: '/es/reservar' } as const;

export const BOOKING_PUBLISHED = SITE_FLAGS.booking.published;

export const CTA = BOOKING_PUBLISHED ? BOOK_PAIR : CONTACT_PAIR;

export const PAIRS = [
  { en: '/', es: '/es' },
  { en: '/pricing', es: '/es/precios' },
  { en: '/about', es: '/es/sobre-nosotros' },
  { en: '/privacy', es: '/es/privacidad' },
  { en: '/cookies', es: '/es/cookies' },
  SERVICES_HUB,
  SERVICE_PAIRS.diagnostic,
  SERVICE_PAIRS.automation,
  SERVICE_PAIRS.integrations,
  SERVICE_PAIRS.agents,
  SERVICE_PAIRS.software,
  SERVICE_PAIRS.training,
  SERVICE_PAIRS.maintenance,
  CASE_PAIR,
  CASES_HUB,
  CONTACT_PAIR,
  ...(CALCULATOR_PUBLISHED ? [CALCULATOR_PAIR] : []),
  ...(BOOKING_PUBLISHED ? [BOOK_PAIR] : []),
] as const;

export const PAGE_TYPE_URLS: readonly string[] = [
  '/',
  '/es',
  '/pricing',
  SERVICES_HUB.en,
  SERVICE_PAIRS.automation.en,
  SERVICE_PAIRS.agents.en,
  SERVICE_PAIRS.diagnostic.en,
  SERVICE_PAIRS.maintenance.en,
  CASE_PAIR.en,
  CASES_HUB.en,
  CONTACT_PAIR.en,
  '/about',
  '/privacy',
  HOLDED_PAGES[1],
  VERIFACTU_PAGE,
  SECTOR_PAGE,
  '/es/aviso-legal',
  ...(BOOKING_PUBLISHED ? [BOOK_PAIR.en] : []),
  ...CALCULATOR_RESULTS.slice(0, 1),
  '/nope',
];

export const LOCALES = ['en', 'es'] as const;

export const LLMS_PATHS = [
  '/llms.txt',
  '/es/llms.txt',
  '/llms-full.txt',
  '/es/llms-full.txt',
] as const;

export const CLUSTERS: ReadonlyArray<{ en?: string; es?: string }> = [
  ...PAIRS,
  ...ES_ONLY_PAGES.map((es) => ({ es })),
];

export const PAGES = CLUSTERS.flatMap((cluster) =>
  [cluster.en, cluster.es].flatMap((url) => url ?? []),
);

export function markdownPathOf(path: string): string {
  return path === '/' ? '/index.md' : `${path}.md`;
}

export function normalise(text: string): string {
  return tidy(text.replace(/\\([\\`*_[\]<>])/g, '$1'));
}

const TAG = /<(?:link|meta)\b[^>]*>/g;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g;

export type Tag = Record<string, string>;

export function tagsOf(html: string): Tag[] {
  return (html.match(TAG) ?? []).map((tag) => {
    const attributes: Tag = {};
    for (const [, name, value] of tag.matchAll(ATTRIBUTE)) {
      if (name) attributes[name.toLowerCase()] = decodeEntities(value ?? '');
    }
    return attributes;
  });
}

interface DeferredScripts {
  entry: string;
  preloads: string[];
}

const LOADER = /const u=(\{.*?\});let done=/;

function isDeferredScripts(value: unknown): value is DeferredScripts {
  if (typeof value !== 'object' || value === null) return false;
  if (!('entry' in value) || !('preloads' in value)) return false;
  return (
    typeof value.entry === 'string' &&
    Array.isArray(value.preloads) &&
    value.preloads.every((href) => typeof href === 'string')
  );
}

export function deferredScripts(html: string): DeferredScripts | undefined {
  const json = LOADER.exec(html)?.[1];
  if (!json) return undefined;
  const value: unknown = JSON.parse(json);
  return isDeferredScripts(value) ? value : undefined;
}

export function htmlLang(html: string): string {
  return /<html[^>]*\blang="([^"]+)"/.exec(html)?.[1] ?? '';
}

export async function waitForHydration(page: Page) {
  await page.waitForSelector('body[data-hydrated="true"]');
}

export async function gotoHydrated(
  page: Page,
  path: string,
  options?: { referer: string },
) {
  await page.goto(path, options);
  await waitForHydration(page);
}

// The contact page's doors: tabs once hydrated. Picks one by its id.
export async function openDoor(page: Page, id: 'book' | 'message' | 'ai') {
  await page.locator(`#door-${id}-tab`).click();
  await expectDoorOpen(page, id);
}

export async function expectDoorOpen(
  page: Page,
  id: 'book' | 'message' | 'ai',
) {
  await expect(page.locator(`#door-${id}-tab`)).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

export async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        // The chat's typing dots loop, so they never settle, and the
        // launcher's scroll-linked hiding follows the page, not the clock.
        .filter(
          (animation) =>
            animation.timeline instanceof DocumentTimeline &&
            !(
              animation.effect?.getComputedTiming().endTime === Infinity &&
              animation.effect instanceof KeyframeEffect &&
              animation.effect.target?.closest('[data-chat-typing]')
            ),
        )
        .map((animation) =>
          animation.finished.catch((error: unknown) => {
            if (
              !(error instanceof DOMException && error.name === 'AbortError')
            ) {
              throw error;
            }
          }),
        ),
    ),
  );
}

export function navLinks(page: Page) {
  return page
    .getByRole('navigation', { name: /^(Main|Principal)$/ })
    .first()
    .getByRole('link');
}

export function typesOf(blocks: unknown[]): unknown[] {
  return blocks.map((block) =>
    typeof block === 'object' && block !== null && '@type' in block
      ? block['@type']
      : undefined,
  );
}

// Booking days split once for every e2e file, so none shares a slot or the
// three-a-day cap with another. `reserved` are the first four whole owner-zone
// days (all twelve times past the notice): booking.e2e.ts takes them in order.
// `spare` is every other day with a time left, latest first, except the first
// day of the horizon when it is only partly open (the 12 h notice edge). The
// horizon is 14 days and calls run Monday to Thursday, so how many days there
// are depends on the clock and the holidays: no fixed offsets are used.
const FULL_DAY = 12;
const RESERVED_DAYS = 4;

export function bookingDays(): { reserved: Slot[][]; spare: string[] } {
  const days = new Map<string, Slot[]>();
  for (const slot of availableSlots({
    rules: BOOKING_RULES,
    now: Date.now(),
    busy: [],
    booked: [],
  })) {
    days.set(slot.day, [...(days.get(slot.day) ?? []), slot]);
  }
  const reserved = [...days.values()]
    .filter((day) => day.length === FULL_DAY)
    .slice(0, RESERVED_DAYS);
  const taken = new Set(reserved.map((day) => day[0]?.day));
  const [first] = days.values();
  const edge = first?.length === FULL_DAY ? undefined : first?.[0]?.day;
  const spare = [...days.keys()]
    .filter((day) => !taken.has(day) && day !== edge)
    .reverse();
  return { reserved, spare };
}

const availabilityAnswer = z.object({
  result: z.object({ slots: z.array(z.object({ start: z.string() })) }),
});

// The last offered slot of the latest spare day with any. `call` runs a tool
// and returns its envelope. Tests that book release their hold with
// `releaseBooking`, so the day cap never builds up across tests.
export async function lateSlot(
  call: (name: string, input: unknown) => Promise<unknown>,
): Promise<string> {
  const { spare } = bookingDays();
  if (spare.length === 0) {
    throw new Error(
      'too few spare booking days in the horizon (holiday week?)',
    );
  }
  for (const day of spare) {
    const answer = availabilityAnswer.parse(
      await call('check_availability', {
        from: day,
        to: day,
        timeZone: BOOKING_RULES.zone,
      }),
    );
    const last = answer.result.slots.at(-1);
    if (last) return last.start;
  }
  throw new Error(
    `no offered slot on the spare booking days ${spare.join(', ')}`,
  );
}
