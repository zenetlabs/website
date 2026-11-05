import { expect, test } from '@playwright/test';
import {
  CASES_HUB,
  CONTACT_PAIR,
  LLMS_PATHS,
  markdownPathOf,
  SERVICE_PAIRS,
} from './helpers';

for (const path of LLMS_PATHS) {
  test(`${path} is plain text, cacheable and noindex`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(headers['x-robots-tag']).toBe('noindex');
    expect(headers['cache-control']).toBe('public, max-age=3600');
    expect(await response.text()).toMatch(/^# Zenet Labs\n\n> /);
  });
}

test('each index has its own headings in the language of the site', async ({
  request,
}) => {
  const es = await (await request.get('/es/llms.txt')).text();
  expect(es).toContain('\n## Preguntas frecuentes\n');
  expect(es).toContain('\n## Optional\n');
  const en = await (await request.get('/llms.txt')).text();
  expect(en).toContain('\n## FAQ\n');
  expect(en).toContain('\n## Optional\n');
});

for (const path of ['/fr/llms.txt', '/fr/llms-full.txt']) {
  test(`${path} answers 404`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(response.headers()['x-robots-tag']).toBe('noindex');
  });
}

test('HEAD on a localised llms file answers 200', async ({ request }) => {
  const response = await request.head('/es/llms.txt');
  expect(response.status()).toBe(200);
});

for (const path of LLMS_PATHS) {
  test(`${path} answers 404 to POST and PUT`, async ({ request }) => {
    for (const response of [
      await request.post(path),
      await request.put(path),
    ]) {
      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('text/plain');
    }
  });
}

test('the llms files list the new pages and the contact page', async ({
  request,
}) => {
  for (const locale of ['en', 'es'] as const) {
    const prefix = locale === 'en' ? '' : '/es';
    const index = await (await request.get(`${prefix}/llms.txt`)).text();
    const full = await (await request.get(`${prefix}/llms-full.txt`)).text();
    for (const path of [
      CONTACT_PAIR[locale],
      CASES_HUB[locale],
      SERVICE_PAIRS.diagnostic[locale],
      SERVICE_PAIRS.maintenance[locale],
    ]) {
      expect(index, path).toContain(`${markdownPathOf(path)})`);
    }
    expect(index).toContain(`${CONTACT_PAIR[locale]}):`);
    expect(index).not.toMatch(/\)#contact|\/pricing#|\/precios#/);
    expect(full).toContain(
      locale === 'en' ? '1. We reply:' : '1. Te respondemos:',
    );
  }
});
