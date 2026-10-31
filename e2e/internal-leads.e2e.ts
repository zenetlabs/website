import AxeBuilder from '@axe-core/playwright';
import { type APIRequestContext, expect, test } from '@playwright/test';
import { accessToken, sentFor, uniqueEmail } from './fakes';

const TOKEN_HEADER = 'Cf-Access-Jwt-Assertion';
const XSS_NAME = '<script>window.__xss = 1</script>';

type Created = { email: string; id: string };

async function createLead(
  request: APIRequestContext,
  baseURL: string,
  name: string,
): Promise<Created> {
  const email = uniqueEmail('internal');
  const response = await request.post('/api/lead', {
    headers: { Origin: baseURL },
    data: {
      source: 'form',
      locale: 'en',
      name,
      email,
      company: 'Analytical Engines',
      message: 'We would like to automate our inbox triage.',
      consent: true,
      turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
      website: '',
      attribution: {
        landing: '/?utm_source=e2e&utm_medium=test&utm_campaign=r6',
        referrer: '',
        page: '/',
      },
    },
  });
  expect(response.status()).toBe(200);
  await expect.poll(async () => (await sentFor(email)).length).toBe(2);
  const owner = (await sentFor(email)).find((entry) => entry.replyTo === email);
  const id = /\/internal\/leads\/([0-9a-f-]{36})/.exec(owner?.text ?? '')?.[1];
  expect(id).toBeTruthy();
  return { email, id: id ?? '' };
}

test('the internal pages refuse requests without a valid Access token', async ({
  request,
}) => {
  for (const path of ['/internal/leads', '/internal/leads.csv']) {
    expect((await request.get(path)).status(), path).toBe(403);
  }
  const wrongAudience = await accessToken({ aud: 'someone-else' });
  const wrongIssuer = await accessToken({
    iss: 'https://evil.cloudflareaccess.com',
  });
  const expired = await accessToken({ exp: 1_000_000_000 });
  for (const token of [wrongAudience, wrongIssuer, expired, 'x.y.z']) {
    const response = await request.get('/internal/leads', {
      headers: { [TOKEN_HEADER]: token },
    });
    expect(response.status()).toBe(403);
    expect(await response.text()).toBe('Forbidden');
  }
});

test('every /internal path is gated before routing, whatever the method', async ({
  request,
}) => {
  const paths = [
    '/internal',
    '/internal/x',
    '/internal/leads/not-a-lead/deeper',
    '/Internal/Leads',
    '/INTERNAL/leads.csv',
    '/%69nternal/leads',
    '/internal%2Fleads',
  ];
  for (const path of paths) {
    for (const method of ['GET', 'POST', 'DELETE'] as const) {
      const response = await request.fetch(path, { method, maxRedirects: 0 });
      expect(response.status(), `${method} ${path}`).toBe(403);
      expect(await response.text()).toBe('Forbidden');
    }
  }
  const headers = { [TOKEN_HEADER]: await accessToken() };
  const unmatched = await request.get('/internal/x', { headers });
  expect(unmatched.status()).toBe(404);
  const post = await request.post('/internal/x', { headers, data: {} });
  expect(post.status()).not.toBe(403);
});

test('a locale-prefixed internal path never serves the leads', async ({
  request,
}) => {
  const response = await request.get('/es/internal/leads');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Download CSV');
});

test('a valid token shows the list, detail and CSV with private headers', async ({
  page,
  request,
  baseURL,
}) => {
  const { email, id } = await createLead(
    request,
    baseURL ?? '',
    'Ada Lovelace',
  );
  const headers = { [TOKEN_HEADER]: await accessToken() };
  await page.setExtraHTTPHeaders(headers);

  const list = await page.goto('/internal/leads');
  expect(list?.status()).toBe(200);
  expect(list?.headers()['cache-control']).toBe('no-store');
  expect(list?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(list?.headers()['content-security-policy']).toContain(
    "default-src 'none'",
  );
  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row).toContainText('e2e');
  await expect(row).toContainText('test');
  await expect(row).toContainText('r6');

  await row.getByRole('link', { name: 'Ada Lovelace' }).click();
  await expect(page).toHaveURL(new RegExp(`/internal/leads/${id}$`));
  await expect(
    page.getByRole('heading', { name: /Ada Lovelace/ }),
  ).toBeVisible();
  const emails = page
    .getByRole('row')
    .filter({ hasText: /owner|confirmation/ });
  await expect(emails).toHaveCount(2);
  for (const status of await emails.allInnerTexts()) {
    expect(status).toContain('sent');
  }

  const csv = await request.get('/internal/leads.csv', { headers });
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-disposition']).toMatch(
    /^attachment; filename="zenetlabs-leads-\d{4}-\d{2}-\d{2}\.csv"$/,
  );
  expect(csv.headers()['content-type']).toBe('text/csv; charset=utf-8');
  const body = (await csv.body()).toString('utf8');
  expect(body.startsWith('﻿"id","created_at"')).toBe(true);
  expect(body).toContain('"utm_source","utm_medium","utm_campaign"');
  expect(body).toContain(`"${email}"`);
  expect(body).toContain('"e2e","test","r6"');
});

test('a hostile name renders inert on the list and detail pages', async ({
  page,
  request,
  baseURL,
}) => {
  const { id } = await createLead(request, baseURL ?? '', XSS_NAME);
  await page.setExtraHTTPHeaders({ [TOKEN_HEADER]: await accessToken() });
  let dialogs = 0;
  page.on('dialog', async (dialog) => {
    dialogs += 1;
    await dialog.dismiss();
  });
  for (const path of ['/internal/leads', `/internal/leads/${id}`]) {
    await page.goto(path);
    await expect(page.getByText(XSS_NAME).first()).toBeVisible();
    expect(
      await page.evaluate(() => 'xss' in window || '__xss' in window),
    ).toBe(false);
  }
  expect(dialogs).toBe(0);
});

test('unknown ids and other methods are handled', async ({ request }) => {
  const headers = { [TOKEN_HEADER]: await accessToken() };
  const missing = await request.get(`/internal/leads/${crypto.randomUUID()}`, {
    headers,
  });
  expect(missing.status()).toBe(404);
  const malformed = await request.get('/internal/leads/not-a-uuid', {
    headers,
  });
  expect(malformed.status()).toBe(404);
  const post = await request.post('/internal/leads', { headers, data: {} });
  expect(post.status()).toBe(405);
  expect(post.headers().allow).toBe('GET');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`the list page has no axe violations (${colorScheme})`, async ({
    browser,
    request,
    baseURL,
  }) => {
    await createLead(request, baseURL ?? '', 'Ada Lovelace');
    const context = await browser.newContext({
      colorScheme,
      extraHTTPHeaders: { [TOKEN_HEADER]: await accessToken() },
    });
    const page = await context.newPage();
    await page.goto(`${baseURL}/internal/leads`);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}
