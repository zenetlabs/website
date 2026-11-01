import type { Page } from '@playwright/test';
import { siteConfig } from '../site.config';
import type { ServiceId } from '../src/content/types';
import { answersQuery } from '../src/lib/calculator-answers';
import { decodeEntities, tidy } from '../src/lib/markdown';
import type { ServicePageId } from '../src/lib/page-registry';
import { G5 } from '../test/calculator-fixtures';

export const SERVICES_HUB = { en: '/services', es: '/es/servicios' } as const;

export const SERVICE_PAIRS = {
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

export const BOOK_PAIR = { en: '/book', es: '/es/reservar' } as const;

export const BOOKING_PUBLISHED = SITE_FLAGS.booking.published;

export const CTA = BOOKING_PUBLISHED
  ? BOOK_PAIR
  : { en: '/#contact', es: '/es#contact' };

export const PAIRS = [
  { en: '/', es: '/es' },
  { en: '/pricing', es: '/es/precios' },
  { en: '/about', es: '/es/sobre-nosotros' },
  { en: '/privacy', es: '/es/privacidad' },
  { en: '/cookies', es: '/es/cookies' },
  SERVICES_HUB,
  SERVICE_PAIRS.automation,
  SERVICE_PAIRS.integrations,
  SERVICE_PAIRS.agents,
  SERVICE_PAIRS.software,
  SERVICE_PAIRS.training,
  CASE_PAIR,
  ...(CALCULATOR_PUBLISHED ? [CALCULATOR_PAIR] : []),
  ...(BOOKING_PUBLISHED ? [BOOK_PAIR] : []),
] as const;

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

export async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
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
