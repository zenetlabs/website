import { gzipSync } from 'node:zlib';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { siteConfig } from '../site.config';
import { aboutPage as enAbout } from '../src/content/en/about';
import { home as enHome } from '../src/content/en/home';
import { pricingPage as enPricing } from '../src/content/en/pricing';
import { aboutPage as esAbout } from '../src/content/es/about';
import { home as esHome } from '../src/content/es/home';
import { pricingPage as esPricing } from '../src/content/es/pricing';
import {
  CASE_PAIR,
  deferredScripts,
  ES_ONLY_PAGES,
  gotoHydrated,
  HOLDED_PAGES,
  PAIRS,
  SECTOR_PAGE,
  tagsOf,
  VERIFACTU_PAGE,
} from './helpers';

Object.assign(globalThis, { __SITE__: siteConfig(undefined) });
const { FAQ } = await import('../test/faq');

const R1_ENTRY_JS_GZIP = 128_361;
const BUDGET = R1_ENTRY_JS_GZIP + 10_240;

const URLS = [...PAIRS.flatMap(({ en, es }) => [en, es]), ...ES_ONLY_PAGES];

type Kind =
  | 'home'
  | 'faq'
  | 'pricing'
  | 'about'
  | 'hub'
  | 'automation'
  | 'integrations'
  | 'agents'
  | 'software'
  | 'training'
  | 'prestashop'
  | 'woocommerce'
  | 'hubspot'
  | 'verifactu'
  | 'sector'
  | 'case';
type Locale = 'en' | 'es';

const NEEDLES: Record<Kind, Partial<Record<Locale, string>>> = {
  home: {
    en: enHome.problems.items[0]?.title ?? '',
    es: esHome.problems.items[0]?.title ?? '',
  },
  faq: {
    en: FAQ.en.find((item) => item.id === 'mistakes')?.question ?? '',
    es: FAQ.es.find((item) => item.id === 'mistakes')?.question ?? '',
  },
  pricing: { en: enPricing.how.title, es: esPricing.how.title },
  about: { en: enAbout.vision.title, es: esAbout.vision.title },
  hub: {
    en: 'AI consulting that ends in',
    es: 'Programas que hacen los pasos repetitivos',
  },
  automation: {
    en: 'Which processes are worth automating first',
    es: 'conviene automatizar primero',
  },
  integrations: {
    en: 'Why not just install a ready-made connector',
    es: 'instalar un conector ya hecho',
  },
  agents: {
    en: 'How is an AI agent different from a chatbot',
    es: 'se diferencia un agente de IA de un chatbot',
  },
  software: {
    en: 'Should we build custom software or buy a product',
    es: 'desarrollar a medida o comprar un producto',
  },
  training: {
    en: 'Who should attend',
    es: 'Cualquiera que escriba, analice o responda',
  },
  prestashop: { es: 'Productos sin referencia' },
  woocommerce: { es: 'Picos de pedidos' },
  hubspot: { es: 'Oportunidades sin datos fiscales' },
  verifactu: { es: 'Registros encadenados' },
  sector: { es: 'Reservas y confirmaciones de proveedores' },
  case: { en: 'a lot of copying', es: 'mucho copiar y pegar' },
};

const PAGES: ReadonlyArray<{
  path: string;
  locale: Locale;
  kinds: readonly Kind[];
}> = [
  { path: '/', locale: 'en', kinds: ['home', 'faq'] },
  { path: '/es', locale: 'es', kinds: ['home', 'faq'] },
  { path: '/pricing', locale: 'en', kinds: ['pricing'] },
  { path: '/es/precios', locale: 'es', kinds: ['pricing'] },
  { path: '/about', locale: 'en', kinds: ['about'] },
  { path: '/es/sobre-nosotros', locale: 'es', kinds: ['about'] },
  { path: '/services', locale: 'en', kinds: ['hub'] },
  { path: '/es/servicios', locale: 'es', kinds: ['hub'] },
  { path: '/services/ai-automation', locale: 'en', kinds: ['automation'] },
  {
    path: '/es/servicios/automatizacion-de-procesos',
    locale: 'es',
    kinds: ['automation'],
  },
  { path: '/services/integrations', locale: 'en', kinds: ['integrations'] },
  {
    path: '/es/servicios/integraciones',
    locale: 'es',
    kinds: ['integrations'],
  },
  { path: '/services/ai-agents', locale: 'en', kinds: ['agents'] },
  { path: '/es/servicios/agentes-de-ia', locale: 'es', kinds: ['agents'] },
  { path: '/services/custom-software', locale: 'en', kinds: ['software'] },
  {
    path: '/es/servicios/desarrollo-de-software-a-medida',
    locale: 'es',
    kinds: ['software'],
  },
  { path: '/services/ai-training', locale: 'en', kinds: ['training'] },
  {
    path: '/es/servicios/formacion-ia-equipos',
    locale: 'es',
    kinds: ['training'],
  },
  { path: HOLDED_PAGES[0], locale: 'es', kinds: ['prestashop'] },
  { path: HOLDED_PAGES[1], locale: 'es', kinds: ['woocommerce'] },
  { path: HOLDED_PAGES[2], locale: 'es', kinds: ['hubspot'] },
  { path: VERIFACTU_PAGE, locale: 'es', kinds: ['verifactu'] },
  { path: SECTOR_PAGE, locale: 'es', kinds: ['sector'] },
  { path: CASE_PAIR.en, locale: 'en', kinds: ['case'] },
  { path: CASE_PAIR.es, locale: 'es', kinds: ['case'] },
];

const KINDS: readonly Kind[] = [
  'home',
  'faq',
  'pricing',
  'about',
  'hub',
  'automation',
  'integrations',
  'agents',
  'software',
  'training',
  'prestashop',
  'woocommerce',
  'hubspot',
  'verifactu',
  'sector',
  'case',
];
const LOCALES: readonly Locale[] = ['en', 'es'];

async function upFrontScripts(request: APIRequestContext, html: string) {
  const deferred = deferredScripts(html);
  const preloaded = tagsOf(html).flatMap((tag) =>
    tag.rel === 'modulepreload' && tag.href ? [tag.href] : [],
  );
  const sources = new Set([
    ...(deferred ? [deferred.entry, ...deferred.preloads] : []),
    ...preloaded,
  ]);
  return Promise.all(
    [...sources].map(async (source) => {
      const body = await (await request.get(source)).body();
      return { source, gzip: gzipSync(body).length, text: body.toString() };
    }),
  );
}

for (const path of URLS) {
  test(`${path} loads at most the R1 entry budget of JavaScript`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();
    const scripts = await upFrontScripts(request, html);
    const total = scripts.reduce((sum, script) => sum + script.gzip, 0);
    console.log(`js-budget ${path} ${total} / ${BUDGET}`);
    expect(scripts.length).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(BUDGET);
  });
}

for (const { path, locale, kinds } of PAGES) {
  test(`${path} renders its own copy and loads no other page or locale up front`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();
    for (const kind of kinds) {
      const needle = NEEDLES[kind][locale] ?? '';
      expect(needle.length, `${kind} needle`).toBeGreaterThan(8);
      expect(html, `${kind} in ${path}`).toContain(needle);
    }
    const scripts = await upFrontScripts(request, html);
    for (const kind of KINDS) {
      for (const other of LOCALES) {
        if (kinds.includes(kind) && other === locale) continue;
        const needle = NEEDLES[kind][other];
        if (needle === undefined) continue;
        expect(
          scripts.filter((script) => script.text.includes(needle)),
          `${kind}/${other} in ${path}`,
        ).toEqual([]);
      }
    }
  });
}

for (const { path, locale, kinds } of PAGES.filter((entry) =>
  entry.kinds.includes('faq'),
)) {
  test(`${path} never fetches the other locale's page copy`, async ({
    page,
  }) => {
    const other = locale === 'en' ? 'es' : 'en';
    const pending: Promise<string>[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.js')) pending.push(response.text());
    });
    await gotoHydrated(page, path);
    await page.waitForLoadState('networkidle');
    const scripts = await Promise.all(pending);
    expect(scripts.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      const needle = NEEDLES[kind][other] ?? '';
      expect(scripts.filter((text) => text.includes(needle))).toEqual([]);
    }
  });
}
