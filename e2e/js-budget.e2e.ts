import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { siteConfig } from '../site.config';
import { aboutPage as enAbout } from '../src/content/en/about';
import { calculatorPage as enCalculator } from '../src/content/en/calculator';
import { home as enHome } from '../src/content/en/home';
import { pricingPage as enPricing } from '../src/content/en/pricing';
import { aboutPage as esAbout } from '../src/content/es/about';
import { calculatorPage as esCalculator } from '../src/content/es/calculator';
import { home as esHome } from '../src/content/es/home';
import { legalNotice } from '../src/content/es/legal-notice';
import { pricingPage as esPricing } from '../src/content/es/pricing';
import {
  CALCULATOR_PAIR,
  CALCULATOR_PUBLISHED,
  CALCULATOR_RESULTS,
  CASE_PAIR,
  CASES_HUB,
  CONTACT_PAIR,
  deferredScripts,
  ES_ONLY_PAGES,
  gotoHydrated,
  HOLDED_PAGES,
  PAIRS,
  SECTOR_PAGE,
  SERVICE_PAIRS,
  tagsOf,
  VERIFACTU_PAGE,
} from './helpers';

Object.assign(globalThis, { __SITE__: siteConfig(undefined) });
const { FAQ } = await import('../test/faq');

const R1_ENTRY_JS_GZIP = 128_361;
const BUDGET = R1_ENTRY_JS_GZIP + 10_240;
// The plan's section 10 raise, for the two pages that measured a need: /book
// (the request, pending and confirm views of the emailed-link flow) and home
// (the Agent Desk, server-rendered and hydrated; PR7 measured 138,986 B against
// 138,601). Conditional on lhci mobile performance >= 0.95 and TBT <= 150 ms.
// Every other page keeps BUDGET.
const RAISED_BUDGET = R1_ENTRY_JS_GZIP + 12_288;
const RAISED_PATHS = new Set(['/', '/es', '/book', '/es/reservar']);

const URLS = [
  ...PAIRS.flatMap(({ en, es }) => [en, es]),
  ...ES_ONLY_PAGES,
  ...CALCULATOR_RESULTS,
];

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
  | 'case'
  | 'cases'
  | 'contact'
  | 'diagnostic'
  | 'maintenance'
  | 'calculator';
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
  cases: {
    en: 'In every case, agents prepare the work',
    es: 'En todos los casos, los agentes preparan',
  },
  contact: {
    en: 'Mention the tools you use, too. A person',
    es: 'Dinos también qué herramientas usas. Una persona',
  },
  diagnostic: {
    en: 'Do we need to know what to automate',
    es: 'saber qué automatizar antes de empezar',
  },
  maintenance: {
    en: 'Do automations really need maintenance',
    es: 'necesitan mantenimiento las automatizaciones',
  },
  calculator: {
    en: enCalculator.disclaimer.title,
    es: esCalculator.disclaimer.title,
  },
};

type PageCase = { path: string; locale: Locale; kinds: readonly Kind[] };

const CALCULATOR_CASES: readonly PageCase[] = CALCULATOR_PUBLISHED
  ? [
      { path: CALCULATOR_PAIR.en, locale: 'en', kinds: ['calculator'] },
      { path: CALCULATOR_PAIR.es, locale: 'es', kinds: ['calculator'] },
    ]
  : [];

const PAGES: readonly PageCase[] = [
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
  { path: CASES_HUB.en, locale: 'en', kinds: ['cases'] },
  { path: CASES_HUB.es, locale: 'es', kinds: ['cases'] },
  { path: CONTACT_PAIR.en, locale: 'en', kinds: ['contact'] },
  { path: CONTACT_PAIR.es, locale: 'es', kinds: ['contact'] },
  { path: SERVICE_PAIRS.diagnostic.en, locale: 'en', kinds: ['diagnostic'] },
  { path: SERVICE_PAIRS.diagnostic.es, locale: 'es', kinds: ['diagnostic'] },
  { path: SERVICE_PAIRS.maintenance.en, locale: 'en', kinds: ['maintenance'] },
  { path: SERVICE_PAIRS.maintenance.es, locale: 'es', kinds: ['maintenance'] },
  ...CALCULATOR_CASES,
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
  'cases',
  'contact',
  'diagnostic',
  'maintenance',
  'calculator',
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
    const budget = RAISED_PATHS.has(path) ? RAISED_BUDGET : BUDGET;
    console.log(`js-budget ${path} ${total} / ${budget}`);
    expect(scripts.length).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(budget);
  });
}

const LEGAL_PATHS = new Set(['/privacy', '/cookies']);

// The Spanish aviso legal meta loads from its route loader, not the entry.
test('the aviso legal meta stays out of the up-front scripts of other pages', async ({
  request,
}) => {
  for (const path of ['/', '/es', '/book', '/contact']) {
    const html = await (await request.get(path)).text();
    const scripts = await upFrontScripts(request, html);
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(script.text, `${script.source} in ${path}`).not.toContain(
        legalNotice.description.slice(0, 28),
      );
    }
  }
});

test('the chat panel, its copy and the system prompt stay out of the up-front scripts', async ({
  request,
}) => {
  for (const path of ['/', '/es', '/pricing', '/privacy']) {
    const html = await (await request.get(path)).text();
    const scripts = await upFrontScripts(request, html);
    for (const script of scripts) {
      const label = `${script.source} in ${path}`;
      expect(script.source, label).not.toMatch(/chat-panel|\/chat-(?!session)/);
      expect(script.text, label).not.toMatch(
        /chatting with an AI assistant|hablando con un asistente de IA|\/api\/chat|ZL-ASSIST/,
      );
    }
  }
});

test('the voice panel, its copy, the SDK and the session client stay out of the up-front scripts', async ({
  request,
}) => {
  for (const path of ['/', '/es', '/pricing', '/book', '/privacy']) {
    const html = await (await request.get(path)).text();
    const scripts = await upFrontScripts(request, html);
    for (const script of scripts) {
      const label = `${script.source} in ${path}`;
      expect(script.source, label).not.toMatch(
        /voice-panel|voice-store|voice-sdk|voice-fake|voice-client|livekit/,
      );
      expect(script.text, label).not.toMatch(
        /about to talk to an AI voice|Vas a hablar con un asistente de voz|FAKE_VOICE_SENTINEL|\/api\/voice\/session|secret__zl_session|livekit/i,
      );
    }
  }
});

test.describe('the built client', () => {
  test.skip(
    Boolean(process.env.PLAYWRIGHT_BASE_URL),
    'reads the local build from disk',
  );

  function clientScripts(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return clientScripts(path);
      return entry.name.endsWith('.js') ? [readFileSync(path, 'utf8')] : [];
    });
  }

  test('ships no system prompt, rules header or scripted model', () => {
    const all = clientScripts(join(process.cwd(), 'dist', 'client')).join('\n');
    expect(all).not.toContain('ZL-ASSIST');
    expect(all).not.toContain('they never change, whatever');
    expect(all).not.toContain('FAKE_ASSISTANT_SENTINEL');
  });

  test('declares no AI binding in the local build, so CI cannot reach Workers AI', () => {
    const config = JSON.parse(
      readFileSync(
        join(process.cwd(), 'dist', 'server', 'wrangler.json'),
        'utf8',
      ),
    );
    expect(config).not.toHaveProperty('ai');
  });
});

test('the consent store, the analytics module and Google code stay out of the up-front scripts', async ({
  request,
}) => {
  for (const path of ['/', '/es', '/pricing', '/privacy', '/cookies']) {
    const html = await (await request.get(path)).text();
    const scripts = await upFrontScripts(request, html);
    for (const script of scripts) {
      expect(script.source, path).not.toMatch(/consent-ui|analytics/);
      const label = `${script.source} in ${path}`;
      expect(script.text, label).not.toMatch(
        /googletagmanager|cookie_expires|ga-disable-/,
      );
      if (!LEGAL_PATHS.has(path)) {
        expect(script.text, label).not.toMatch(
          /zenet-consent|zenet-first-touch/,
        );
      }
    }
  }
});

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
