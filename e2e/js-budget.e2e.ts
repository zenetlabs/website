import { gzipSync } from 'node:zlib';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { siteConfig } from '../site.config';
import { aboutPage as enAbout } from '../src/content/en/about';
import { home as enHome } from '../src/content/en/home';
import { pricingPage as enPricing } from '../src/content/en/pricing';
import { aboutPage as esAbout } from '../src/content/es/about';
import { home as esHome } from '../src/content/es/home';
import { pricingPage as esPricing } from '../src/content/es/pricing';
import { gotoHydrated, PAIRS, tagsOf } from './helpers';

Object.assign(globalThis, { __SITE__: siteConfig(undefined) });
const { FAQ } = await import('../test/faq');

const R1_ENTRY_JS_GZIP = 128_361;
const BUDGET = R1_ENTRY_JS_GZIP + 10_240;

const URLS = PAIRS.flatMap(({ en, es }) => [en, es]);

type Kind = 'home' | 'faq' | 'pricing' | 'about';
type Locale = 'en' | 'es';

const NEEDLES: Record<Kind, Record<Locale, string>> = {
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
];

const KINDS: readonly Kind[] = ['home', 'faq', 'pricing', 'about'];
const LOCALES: readonly Locale[] = ['en', 'es'];

async function upFrontScripts(request: APIRequestContext, html: string) {
  const sources = new Set<string>();
  for (const tag of html.match(/<(?:link|script)\b[^>]*>/g) ?? []) {
    const [attributes] = tagsOf(tag);
    if (!attributes) continue;
    const source =
      attributes.rel === 'modulepreload'
        ? attributes.href
        : attributes.type === 'module'
          ? attributes.src
          : undefined;
    if (source) sources.add(source);
  }
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
      const needle = NEEDLES[kind][locale];
      expect(needle.length, `${kind} needle`).toBeGreaterThan(8);
      expect(html, `${kind} in ${path}`).toContain(needle);
    }
    const scripts = await upFrontScripts(request, html);
    for (const kind of KINDS) {
      for (const other of LOCALES) {
        if (kinds.includes(kind) && other === locale) continue;
        const needle = NEEDLES[kind][other];
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
      expect(
        scripts.filter((text) => text.includes(NEEDLES[kind][other])),
      ).toEqual([]);
    }
  });
}
