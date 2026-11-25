import { gzipSync } from 'node:zlib';
import AxeBuilder from '@axe-core/playwright';
import { type Browser, expect, type Page } from '@playwright/test';
import { z } from 'zod';
import {
  confirmByLink,
  confirmLinkFor,
  googleEvents,
  releaseBooking,
  uniqueEmail,
} from './fakes';
import { test } from './fixtures';
import {
  BOOKING_PUBLISHED,
  CALCULATOR_PUBLISHED,
  gotoHydrated,
  lateSlot,
  settleAnimations,
  WEBMCP_PUBLISHED,
  waitForHydration,
} from './helpers';
import { installModelContext, startCall } from './webmcp-stub';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const TOOL_NAMES = [
  'get_faq',
  'get_pricing',
  'estimate_project',
  'check_availability',
  'book_meeting',
  'navigate',
  'list_pages',
  'get_page',
  'search_site',
  'open_contact_form',
];
const BOOKING_TOOLS = new Set(['check_availability', 'book_meeting']);
// A dark feature is never registered: no booking tools, no estimate.
const EXPECTED_NAMES = TOOL_NAMES.filter(
  (name) =>
    (BOOKING_PUBLISHED || !BOOKING_TOOLS.has(name)) &&
    (CALCULATOR_PUBLISHED || name !== 'estimate_project'),
);
const PAGES = [
  { locale: 'en', path: '/', title: 'Get official prices', currency: 'SGD' },
  {
    locale: 'es',
    path: '/es',
    title: 'Consultar precios oficiales',
    currency: 'EUR',
  },
] as const;
const DIALOG = {
  en: {
    title: 'Confirm your call',
    confirm: 'Request this time',
    cancel: 'Cancel',
  },
  es: {
    title: 'Confirma tu llamada',
    confirm: 'Pedir esta hora',
    cancel: 'Cancelar',
  },
} as const;
const MAX_LAZY_GZIP = 10_240;
const TOPIC = 'Automate our inbox triage';

async function registered(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__webmcp?.names().length ?? 0), {
      timeout: 20_000,
    })
    .toBe(EXPECTED_NAMES.length);
}

async function names(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__webmcp?.names() ?? []);
}

async function scriptGzip(page: Page, path: string): Promise<number> {
  let total = 0;
  const pending: Array<Promise<void>> = [];
  page.on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    pending.push(
      response.body().then(
        (body) => {
          total += gzipSync(body).length;
        },
        () => undefined,
      ),
    );
  });
  await gotoHydrated(page, path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await Promise.all(pending);
  return total;
}

function offeredSlot(page: Page): Promise<string> {
  return lateSlot((name, input) => startCall(page, name, input));
}

function bookPosts(page: Page): string[] {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/api/tools/book_meeting')
    ) {
      posts.push(request.url());
    }
  });
  return posts;
}

function problems(page: Page): string[] {
  const seen: string[] = [];
  page.on('pageerror', (error) => seen.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') seen.push(`console: ${message.text()}`);
  });
  return seen;
}

async function ownerEvents(email: string) {
  return (await googleEvents()).filter((event) =>
    event.attendees.some((attendee) => attendee.email === email),
  );
}

async function newPage(browser: Browser, withStub: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  if (withStub) await installModelContext(page);
  return { context, page };
}

test.describe('without modelContext', () => {
  for (const { path } of PAGES) {
    test(`${path} loads nothing for WebMCP and raises no errors`, async ({
      page,
    }) => {
      const seen = problems(page);
      const requested: string[] = [];
      const scripts: Array<Promise<string>> = [];
      page.on('request', (request) => requested.push(request.url()));
      page.on('response', (response) => {
        if (response.request().resourceType() === 'script') {
          scripts.push(response.text().catch(() => ''));
        }
      });
      await gotoHydrated(page, path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      expect(requested.filter((url) => url.includes('/api/tools'))).toEqual([]);
      const bodies = await Promise.all(scripts);
      expect(
        bodies.filter((body) => body.includes('consequentialHint')),
      ).toEqual([]);
      expect(
        await page.locator('meta[http-equiv="origin-trial"]').count(),
      ).toBe(0);
      expect(seen).toEqual([]);
    });
  }
});

test.describe('with modelContext', () => {
  test.skip(!WEBMCP_PUBLISHED, 'WebMCP is not published in this build');

  for (const { locale, path, title } of PAGES) {
    test(`${path} registers the tools in ${locale}, once, with the annotations`, async ({
      page,
    }) => {
      await installModelContext(page);
      const seen = problems(page);
      const manifests: string[] = [];
      page.on('request', (request) => {
        if (request.url().endsWith('/api/tools')) manifests.push(request.url());
      });
      await gotoHydrated(page, path);
      await registered(page);
      expect(await names(page)).toEqual(EXPECTED_NAMES);
      expect(manifests).toHaveLength(1);
      const pricing = await page.evaluate(() =>
        window.__webmcp?.describe('get_pricing'),
      );
      expect(pricing?.title).toBe(title);
      expect(pricing?.annotations).toEqual({ readOnlyHint: true });
      for (const name of EXPECTED_NAMES) {
        const described = await page.evaluate(
          (tool) => window.__webmcp?.describe(tool),
          name,
        );
        expect(described?.inputSchema.type, name).toBe('object');
        expect(JSON.stringify(described?.inputSchema), name).not.toContain(
          '"locale"',
        );
        expect(described?.description.length, name).toBeGreaterThan(40);
      }
      if (BOOKING_PUBLISHED) {
        const book = await page.evaluate(() =>
          window.__webmcp?.describe('book_meeting'),
        );
        expect(book?.annotations).toEqual({
          readOnlyHint: false,
          consequentialHint: true,
        });
        expect(book?.description).toContain(
          locale === 'en'
            ? 'only when they open it and press Confirm'
            : 'solo cuando lo abre y pulsa Confirmar',
        );
      }
      expect(seen).toEqual([]);
    });
  }

  test('the registration chunk costs under 10 KB gzip after hydration', async ({
    browser,
  }) => {
    const plain = await newPage(browser, false);
    const stubbed = await newPage(browser, true);
    try {
      const without = await scriptGzip(plain.page, '/');
      const withStub = await scriptGzip(stubbed.page, '/');
      await registered(stubbed.page);
      const extra = withStub - without;
      console.log(`WebMCP lazy JS after hydration: ${extra} bytes gzip`);
      expect(extra).toBeGreaterThan(0);
      expect(extra).toBeLessThanOrEqual(MAX_LAZY_GZIP);
    } finally {
      await plain.context.close();
      await stubbed.context.close();
    }
  });

  for (const { locale, path, currency } of PAGES) {
    test(`the read tools answer for the ${locale} market`, async ({ page }) => {
      await installModelContext(page);
      await gotoHydrated(page, path);
      await registered(page);
      expect(
        await startCall(page, 'get_pricing', { locale: 'en' }),
      ).toMatchObject({
        ok: true,
        result: { currency },
      });
      expect(
        await startCall(page, 'get_faq', { query: 'how long' }),
      ).toMatchObject({ ok: true });
      expect(await startCall(page, 'get_faq', {})).toMatchObject({
        ok: false,
        error: 'invalid',
        issues: [{ path: 'query' }],
      });
      if (CALCULATOR_PUBLISHED) {
        const estimate = startCall(page, 'estimate_project', {
          answers: {
            type: 'automation',
            tools: ['erp'],
            volume: 'low',
            agent: false,
            web: false,
            urgency: 'standard',
            maintenance: false,
          },
        });
        expect(await estimate).toMatchObject({ ok: true });
      }
      if (BOOKING_PUBLISHED) {
        expect(
          await startCall(page, 'check_availability', {
            timeZone: 'Asia/Tokyo',
          }),
        ).toMatchObject({ ok: true, result: { status: 'ok' } });
      }
    });
  }

  test.describe('reading the site', () => {
    test('list_pages lists the pages of the page language, and only those', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      const english = await startCall(page, 'list_pages', {});
      expect(english).toMatchObject({ ok: true });
      const ids = JSON.stringify(english);
      expect(ids).toContain('"id":"pricing"');
      expect(ids).not.toContain('"id":"verifactu"');
      expect(ids).not.toContain('"id":"holdedPrestashop"');
      expect(JSON.stringify(english).length).toBeLessThanOrEqual(3_000);

      await gotoHydrated(page, '/es');
      await registered(page);
      const spanish = JSON.stringify(
        await startCall(page, 'list_pages', { locale: 'en' }),
      );
      expect(spanish).toContain('"id":"verifactu"');
      expect(spanish).toContain('"id":"holdedPrestashop"');
      expect(spanish.length).toBeLessThanOrEqual(3_000);
    });

    test('search_site answers for the market: WhatsApp in English, Holded only in Spanish', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      const whatsapp = JSON.stringify(
        await startCall(page, 'search_site', { query: 'WhatsApp' }),
      );
      expect(whatsapp).toContain('"page":"integrations"');
      expect(whatsapp.length).toBeLessThanOrEqual(2_000);
      expect(
        await startCall(page, 'search_site', { query: 'Holded' }),
      ).toMatchObject({
        ok: true,
        result: { results: [], contact: { email: 'hello@zenetlabs.com' } },
      });
      expect(await startCall(page, 'search_site', {})).toMatchObject({
        ok: false,
        error: 'invalid',
        issues: [{ path: 'query' }],
      });

      await gotoHydrated(page, '/es');
      await registered(page);
      const holded = JSON.stringify(
        await startCall(page, 'search_site', { query: 'Holded' }),
      );
      expect(holded).toMatch(/"page":"holded(Prestashop|Woocommerce|Hubspot)"/);
    });

    for (const { path, currency } of [
      { path: '/', currency: 'S$' },
      { path: '/es', currency: '€' },
    ]) {
      test(`get_page reads pricing from ${path}: outline, then a section in ${currency}`, async ({
        page,
      }) => {
        await installModelContext(page);
        await gotoHydrated(page, path);
        await registered(page);
        const outline = await startCall(page, 'get_page', { page: 'pricing' });
        expect(outline).toMatchObject({
          ok: true,
          result: { status: 'page', page: 'pricing' },
        });
        const { result } = z
          .object({ result: z.object({ sections: z.array(z.string()) }) })
          .parse(outline);
        expect(result.sections.length).toBeGreaterThan(2);
        const priced = await startCall(page, 'get_page', {
          page: 'pricing',
          section: result.sections[1],
        });
        const text = JSON.stringify(priced);
        expect(text).toContain('"status":"section"');
        expect(text).toContain(currency);
        expect(text).not.toMatch(/https?:\/\//);
        expect(text.length).toBeLessThanOrEqual(2_000);
        expect(
          await startCall(page, 'get_page', {
            page: 'pricing',
            section: 'zzz',
          }),
        ).toMatchObject({ ok: true, result: { status: 'not_found' } });
      });
    }

    test('get_page refuses book and anything that is not a page id', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      expect(await startCall(page, 'get_page', { page: 'book' })).toMatchObject(
        { ok: true, result: { status: 'not_available' } },
      );
      expect(
        await startCall(page, 'get_page', { page: '/pricing' }),
      ).toMatchObject({ ok: false, error: 'invalid' });
    });
  });

  test.describe('open_contact_form', () => {
    for (const { path, contact, message } of [
      {
        path: '/',
        contact: '/contact',
        message: 'We run Xero and Shopify and want our orders synced.',
      },
      {
        path: '/es',
        contact: '/es/contacto',
        message: 'Usamos Holded y queremos automatizar las facturas.',
      },
    ]) {
      test(`from ${path} it opens ${contact} with the draft in the form and sends nothing`, async ({
        page,
      }) => {
        await installModelContext(page);
        const leads: string[] = [];
        page.on('request', (request) => {
          if (request.url().includes('/api/lead')) leads.push(request.url());
        });
        await gotoHydrated(page, path);
        await registered(page);
        const answer = await startCall(page, 'open_contact_form', { message });
        expect(answer).toMatchObject({
          ok: true,
          result: { url: expect.stringContaining(`${contact}?message=`) },
        });
        await expect(page).toHaveURL(new RegExp(`${contact}\\?message=`));
        await waitForHydration(page);
        await expect(page.locator('textarea[name="message"]')).toHaveValue(
          message,
        );
        expect(leads).toEqual([]);
      });
    }

    test('on the contact page it does not reload, so what was typed stays', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/contact');
      await registered(page);
      await page.getByLabel('Name').fill('Ada Lovelace');
      await page.evaluate(() => {
        Object.assign(window, { marker: 'same-document' });
      });
      expect(
        await startCall(page, 'open_contact_form', { message: 'A draft.' }),
      ).toEqual({ ok: true, result: { url: '/contact', current: true } });
      expect(new URL(page.url()).pathname).toBe('/contact');
      expect(new URL(page.url()).search).toBe('');
      expect(await page.evaluate(() => Reflect.get(window, 'marker'))).toBe(
        'same-document',
      );
      await expect(page.getByLabel('Name')).toHaveValue('Ada Lovelace');
    });

    test('an empty or too long message is invalid and goes nowhere', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      for (const message of ['', 'x'.repeat(1501)]) {
        expect(
          await startCall(page, 'open_contact_form', { message }),
        ).toMatchObject({ ok: false, error: 'invalid' });
      }
      expect(new URL(page.url()).pathname).toBe('/');
    });
  });

  test.describe('navigate', () => {
    test('opens an allow-listed page after returning the result', async ({
      page,
    }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      expect(await startCall(page, 'navigate', { page: 'pricing' })).toEqual({
        ok: true,
        result: { url: '/pricing' },
      });
      await expect(page).toHaveURL(/\/pricing$/);
    });

    test('scrolls to a home section without a reload', async ({ page }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      await page.evaluate(() => {
        Object.assign(window, { marker: 'same-document' });
      });
      await startCall(page, 'navigate', { page: 'home', section: 'faq' });
      await expect(page).toHaveURL(/\/#faq$/);
      await expect(page.locator('#faq')).toBeInViewport();
      expect(await page.evaluate(() => Reflect.get(window, 'marker'))).toBe(
        'same-document',
      );
    });

    test('refuses unknown targets and URLs and stays put', async ({ page }) => {
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      expect(
        await startCall(page, 'navigate', { page: 'legalNotice' }),
      ).toEqual({
        ok: false,
        error: 'unknown_target',
      });
      expect(
        await startCall(page, 'navigate', { page: 'https://evil.example' }),
      ).toMatchObject({ ok: false, error: 'invalid' });
      await page.waitForTimeout(300);
      expect(new URL(page.url()).pathname).toBe('/');
    });
  });

  test('an older navigator.modelContext still registers the tools', async ({
    page,
  }) => {
    await installModelContext(page, { host: 'navigator' });
    await gotoHydrated(page, '/');
    await registered(page);
    expect(await names(page)).toEqual(EXPECTED_NAMES);
  });

  test('a registerTool that rejects causes no page errors', async ({
    page,
  }) => {
    await installModelContext(page, { rejectRegister: true });
    const seen = problems(page);
    await gotoHydrated(page, '/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    expect(await names(page)).toEqual([]);
    expect(seen).toEqual([]);
  });
});

test.describe('book_meeting confirmation', () => {
  test.skip(
    !WEBMCP_PUBLISHED || !BOOKING_PUBLISHED,
    'WebMCP booking is not published in this build',
  );
  test.describe.configure({ mode: 'serial' });

  for (const locale of ['en', 'es'] as const) {
    const base = locale === 'en' ? '/' : '/es';
    const copy = DIALOG[locale];

    test(`${locale}: the agent cannot book without the visitor: dialog, no consent, no POST; Cancel and Escape decline`, async ({
      page,
    }) => {
      await installModelContext(page);
      const posts = bookPosts(page);
      await gotoHydrated(page, base);
      await registered(page);
      const slot = await offeredSlot(page);
      const email = uniqueEmail('webmcp-cancel');

      const first = startCall(page, 'book_meeting', {
        slot,
        topic: TOPIC,
        email,
        consent: true,
        turnstileToken: 'forged',
        website: 'spam',
      });
      const dialog = page.getByRole('dialog', { name: copy.title });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('checkbox')).not.toBeChecked();
      // Confirm is live (it waits for the challenge itself), but the unticked
      // consent blocks the submit: nothing is posted.
      const confirm = dialog.getByRole('button', { name: copy.confirm });
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect(dialog).toBeVisible();
      expect(posts).toEqual([]);
      expect(
        await startCall(page, 'book_meeting', { slot, topic: TOPIC }),
      ).toEqual({ ok: false, error: 'busy' });
      await dialog.getByRole('button', { name: copy.cancel }).click();
      expect(await first).toEqual({ ok: true, result: { status: 'declined' } });
      await expect(dialog).toBeHidden();

      const second = startCall(page, 'book_meeting', { slot, topic: TOPIC });
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await second).toEqual({
        ok: true,
        result: { status: 'declined' },
      });
      await expect(dialog).toBeHidden();
      expect(posts).toEqual([]);
      expect(await ownerEvents(email)).toEqual([]);
    });

    test(`${locale}: holds after the visitor fills the form, ticks consent and confirms, and books from the email`, async ({
      page,
    }) => {
      await installModelContext(page);
      const posts = bookPosts(page);
      await gotoHydrated(page, base);
      await registered(page);
      const slot = await offeredSlot(page);
      const email = uniqueEmail('webmcp');

      const call = startCall(page, 'book_meeting', { slot, topic: TOPIC });
      const dialog = page.getByRole('dialog', { name: copy.title });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel(/^(Name|Nombre)$/).fill('[TEST] WebMCP');
      await dialog.getByLabel(/^(Email|Correo|E-mail)/).fill(email);
      await dialog.getByRole('checkbox').check();
      const confirm = dialog.getByRole('button', { name: copy.confirm });
      await expect(confirm).toBeEnabled({ timeout: 30_000 });
      await confirm.click();

      const answer = await call;
      expect(answer).toEqual({
        ok: true,
        result: {
          status: 'pending',
          label: expect.any(String),
          expiresAt: expect.any(String),
        },
      });
      expect(posts).toHaveLength(1);
      const done = page.getByRole('dialog', {
        name: locale === 'en' ? 'Check your inbox' : 'Revisa tu correo',
      });
      await expect(done.getByRole('heading')).toBeFocused();
      expect(await ownerEvents(email)).toEqual([]);

      // An answered dialog does not block the next proposal: it is replaced.
      const next = await offeredSlot(page);
      const again = startCall(page, 'book_meeting', {
        slot: next,
        topic: TOPIC,
      });
      await expect(
        page.getByRole('dialog', { name: copy.title }),
      ).toBeVisible();
      await expect(done).toBeHidden();
      await page
        .getByRole('dialog', { name: copy.title })
        .getByRole('button', { name: copy.cancel })
        .click();
      expect(await again).toEqual({ ok: true, result: { status: 'declined' } });

      expect(
        await confirmByLink(page.request, await confirmLinkFor(email)),
      ).toBe(303);
      await expect.poll(async () => (await ownerEvents(email)).length).toBe(1);
      await releaseBooking(page.request, email);
    });
  }

  test('a time the calendar never offered is rejected without a dialog', async ({
    page,
  }) => {
    await installModelContext(page);
    const posts = bookPosts(page);
    await gotoHydrated(page, '/');
    await registered(page);
    const offered = Date.parse(await offeredSlot(page));
    const invented = new Date(offered + 7 * 60_000).toISOString();
    expect(
      await startCall(page, 'book_meeting', { slot: invented, topic: TOPIC }),
    ).toEqual({
      ok: true,
      result: { status: 'rejected', reason: 'invalid_slot' },
    });
    expect(
      await startCall(page, 'book_meeting', { topic: TOPIC }),
    ).toMatchObject({
      ok: false,
      error: 'invalid',
    });
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(posts).toEqual([]);
  });

  test('an agent abort closes the dialog', async ({ page }) => {
    await installModelContext(page);
    await gotoHydrated(page, '/');
    await registered(page);
    const slot = await offeredSlot(page);
    const call = startCall(page, 'book_meeting', { slot, topic: TOPIC });
    const dialog = page.getByRole('dialog', { name: DIALOG.en.title });
    await expect(dialog).toBeVisible();
    await page.evaluate(() => window.__webmcp?.abort());
    expect(await call).toEqual({ ok: true, result: { status: 'cancelled' } });
    await expect(dialog).toBeHidden();
  });

  for (const viewport of [
    { width: 412, height: 915 },
    { width: 1280, height: 900 },
  ]) {
    test(`the open dialog has no axe violations at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installModelContext(page);
      await gotoHydrated(page, '/');
      await registered(page);
      const slot = await offeredSlot(page);
      const call = startCall(page, 'book_meeting', { slot, topic: TOPIC });
      const dialog = page.getByRole('dialog', { name: DIALOG.en.title });
      await expect(dialog).toBeVisible();
      await settleAnimations(page);
      const results = await new AxeBuilder({ page })
        .withTags(TAGS)
        .exclude('iframe[src*="challenges.cloudflare.com"]')
        .analyze();
      expect(results.violations).toEqual([]);
      await dialog.getByRole('button', { name: DIALOG.en.cancel }).click();
      await call;
    });
  }
});
