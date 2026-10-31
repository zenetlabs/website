import { expect, test } from '@playwright/test';
import { formatPrice, formatPriceSummary } from '../src/lib/money';
import { faqPairs, jsonLdBlocks } from '../test/json-ld';
import { SERVICES } from '../test/page-content';
import { LOCALES, markdownPathOf, normalise, PAGES, PAIRS } from './helpers';

const VARY_ACCEPT = /(^|,)\s*accept\s*(,|$)/i;

function canonicalPath(link: string | undefined): string {
  const match = /^<([^>]+)>; rel="canonical"$/.exec(link ?? '');
  return match?.[1] ? new URL(match[1]).pathname : '';
}

for (const path of PAGES) {
  test(`${path} is served as markdown`, async ({ request }) => {
    const html = await (await request.get(path)).text();
    const scripts = html.match(/<script\b[^>]*type="application\/ld\+json"/g);
    const response = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(headers.vary).toMatch(VARY_ACCEPT);
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(canonicalPath(headers.link)).toBe(path);

    const body = await response.text();
    expect(body.startsWith('---\ntitle: "')).toBe(true);
    const frontmatter = body.split('\n---\n')[0] ?? '';
    expect(frontmatter).toContain('\ndescription: "');
    const canonical = /^canonical: "([^"]+)"$/m.exec(frontmatter);
    expect(new URL(canonical?.[1] ?? '').pathname).toBe(path);
    expect(body).toMatch(/^# \S/m);
    expect(body).not.toMatch(/<\/?[a-z][^>]*>/);

    const fences = Array.from(body.matchAll(/```json\n([\s\S]*?)\n```/g));
    expect(fences).toHaveLength(scripts?.length ?? 0);
    expect(fences.length).toBeGreaterThanOrEqual(3);
    for (const [, json] of fences) {
      const parsed: unknown = JSON.parse(json ?? '');
      expect(parsed).toBeTruthy();
    }
  });
}

test('the home markdown keeps content and drops chrome', async ({
  request,
}) => {
  const response = await request.get('/', {
    headers: { accept: 'text/markdown' },
  });
  const body = await response.text();
  for (const expected of [
    '# Stop doing *by hand* what your tools can do on their own.',
    '## What we do, and *what it costs*',
    'S$3,000',
    "What do you do, and what don't you do?\n\nWe connect the tools",
    '[hello@zenetlabs.com](mailto:hello@zenetlabs.com)',
  ]) {
    expect(body).toContain(expected);
  }
  for (const unexpected of [
    'Skip to content',
    'What should we look at?',
    'Send message',
    'synced new Shopify orders',
    'UEN 202202371M',
  ]) {
    expect(body).not.toContain(unexpected);
  }
});

test('the Spanish pricing markdown keeps the ladder and its prices', async ({
  request,
}) => {
  const response = await request.get('/es/precios', {
    headers: { accept: 'text/markdown' },
  });
  const body = await response.text();
  expect(body).toContain('## Diagnóstico de automatización');
  expect(body).toContain('1.500 €');
});

const NEGOTIATION: ReadonlyArray<readonly [string, string]> = [
  ['text/markdown, text/html;q=0.9', 'text/markdown'],
  ['text/*', 'text/markdown'],
  [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8',
    'text/html',
  ],
  ['text/markdown;q=0.5, text/html', 'text/html'],
  ['text/html, text/markdown', 'text/html'],
  ['*/*', 'text/html'],
];

for (const [accept, type] of NEGOTIATION) {
  test(`Accept "${accept}" gets ${type}`, async ({ request }) => {
    const response = await request.get('/', { headers: { accept } });
    expect(response.headers()['content-type']).toMatch(new RegExp(`^${type}`));
    expect(response.headers().vary).toMatch(VARY_ACCEPT);
  });
}

for (const path of ['/nope', '/es/nope']) {
  test(`${path} answers 404 as markdown without a canonical link`, async ({
    request,
  }) => {
    const response = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    expect(response.status()).toBe(404);
    expect(response.headers()['content-type']).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers().link).toBeUndefined();
  });
}

test('HEAD with a markdown Accept returns the markdown headers and no body', async ({
  request,
}) => {
  const response = await request.head('/', {
    headers: { accept: 'text/markdown' },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe(
    'text/markdown; charset=utf-8',
  );
  expect(canonicalPath(response.headers().link)).toBe('/');
  expect(response.headers().vary).toMatch(VARY_ACCEPT);
  expect((await response.body()).length).toBe(0);
});

test('POST is never converted to markdown', async ({ request }) => {
  const response = await request.post('/', {
    headers: { accept: 'text/markdown' },
  });
  expect(response.headers()['content-type'] ?? '').not.toContain(
    'text/markdown',
  );
});

for (const path of PAGES) {
  const md = markdownPathOf(path);

  test(`${md} is the markdown twin of ${path}`, async ({ request }) => {
    const response = await request.get(md);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toBe('text/markdown; charset=utf-8');
    expect(headers.vary ?? '').not.toMatch(VARY_ACCEPT);
    expect(headers['x-robots-tag']).toBeUndefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(canonicalPath(headers.link)).toBe(path);

    const negotiated = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    expect(await response.text()).toBe(await negotiated.text());
  });
}

test('Accept text/html on a .md url still returns markdown', async ({
  request,
}) => {
  const response = await request.get('/pricing.md', {
    headers: { accept: 'text/html' },
  });
  expect(response.headers()['content-type']).toBe(
    'text/markdown; charset=utf-8',
  );
});

test('HEAD on a .md url returns the headers and no body', async ({
  request,
}) => {
  const response = await request.head('/pricing.md');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe(
    'text/markdown; charset=utf-8',
  );
  expect(canonicalPath(response.headers().link)).toBe('/pricing');
  expect((await response.body()).length).toBe(0);
});

test('POST to a .md url is not converted', async ({ request }) => {
  const response = await request.post('/pricing.md');
  expect(response.headers()['content-type'] ?? '').not.toContain(
    'text/markdown',
  );
});

for (const path of [
  '/nope.md',
  '/precios.md',
  '/es/pricing.md',
  '/es/index.md',
  '/aviso-legal.md',
  '/index.html.md',
]) {
  test(`${path} answers 404 with noindex`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()['x-robots-tag']).toBe('noindex');
  });
}

test('the service page markdown keeps the answer, the FAQ and the contact', async ({
  request,
}) => {
  const en = await (
    await request.get('/services/ai-automation', {
      headers: { accept: 'text/markdown' },
    })
  ).text();
  for (const expected of [
    '# AI automation for the work your team *still does by hand*',
    'from S$8,000 (excl. GST)',
    'Which processes are worth automating first?',
    '[hello@zenetlabs.com](mailto:hello@zenetlabs.com)',
  ]) {
    expect(en).toContain(expected);
  }
  const [, afterFrontmatter = ''] = en.split('\n---\n');
  expect(afterFrontmatter.split('\n# ')[0]?.trim()).toBe(
    'Services · AI automation',
  );
  expect(en.match(/```json/g)).toHaveLength(6);

  const es = await (await request.get('/es/servicios.md')).text();
  for (const row of [
    'Automatización de procesos',
    'Integraciones',
    'Agentes de IA',
    'Software a medida',
    'Formación en IA para equipos',
  ]) {
    expect(es).toMatch(new RegExp(`^## \\[${row}\\]\\(`, 'm'));
  }
});

const AGENT_PAGES = LOCALES.map((locale) => ({
  locale,
  home: PAIRS[0][locale],
  pricing: PAIRS[1][locale],
}));

for (const { locale, home, pricing } of AGENT_PAGES) {
  test(`${markdownPathOf(home)} holds the prices, the FAQ and the contact`, async ({
    request,
  }) => {
    const html = await (await request.get(home)).text();
    const body = normalise(
      await (await request.get(markdownPathOf(home))).text(),
    );
    for (const service of Object.values(SERVICES[locale])) {
      expect(body).toContain(
        normalise(formatPriceSummary(locale, service.prices)),
      );
    }
    const pairs = faqPairs(jsonLdBlocks(html));
    expect(pairs.length).toBeGreaterThan(10);
    for (const [question, answer] of pairs) {
      expect(body).toContain(normalise(question));
      expect(body).toContain(normalise(answer));
    }
    expect(body).toContain('[hello@zenetlabs.com](mailto:hello@zenetlabs.com)');
  });

  test(`${markdownPathOf(pricing)} holds every price row`, async ({
    request,
  }) => {
    const body = normalise(
      await (await request.get(markdownPathOf(pricing))).text(),
    );
    for (const service of Object.values(SERVICES[locale])) {
      for (const price of service.prices) {
        expect(body).toContain(normalise(formatPrice(locale, price)));
      }
    }
  });
}

test('the Verifactu markdown keeps the dates, the price and the note', async ({
  request,
}) => {
  const body = normalise(
    await (await request.get('/es/verifactu-integracion.md')).text(),
  );
  for (const expected of [
    'Fechas revisadas el',
    'desde 4.000 €',
    'no es asesoramiento fiscal ni jurídico',
    '1 de enero de 2027',
    '1 de julio de 2027',
  ]) {
    expect(body).toContain(normalise(expected));
  }
  expect(body).not.toContain('Ruta de navegación');
  expect(body).not.toMatch(/certificad/i);
});

test('the case markdown keeps the title, the date and no placeholder', async ({
  request,
}) => {
  const es = await (await request.get('/es/casos/viatsy.md')).text();
  expect(es).toContain(
    '# Viatsy, una agencia de viajes que *funciona con agentes de IA*',
  );
  expect(es).toContain('Publicado');
  expect(es).not.toContain('Ruta de navegación');
  expect(es).not.toContain('[X]');
  expect(es.match(/```json/g)).toHaveLength(5);
  const en = await (await request.get('/case-studies/viatsy.md')).text();
  expect(en).toContain('# Viatsy, a travel company *run with AI agents*');
  expect(en.match(/```json/g)).toHaveLength(5);
});
