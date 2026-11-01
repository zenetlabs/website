import { gzipSync } from 'node:zlib';
import AxeBuilder from '@axe-core/playwright';
import { type Browser, expect, type Page, test } from '@playwright/test';
import { googleEvents, sentFor, uniqueEmail } from './fakes';
import {
  BOOKING_PUBLISHED,
  gotoHydrated,
  lateSlot,
  settleAnimations,
  WEBMCP_PUBLISHED,
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
];
const BOOKING_TOOLS = new Set(['check_availability', 'book_meeting']);
const EXPECTED_NAMES = TOOL_NAMES.filter(
  (name) => BOOKING_PUBLISHED || !BOOKING_TOOLS.has(name),
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
    confirm: 'Confirm booking',
    cancel: 'Cancel',
  },
  es: {
    title: 'Confirma tu llamada',
    confirm: 'Confirmar reserva',
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
          locale === 'en' ? 'Nothing is booked' : 'No se reserva nada',
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
      if (BOOKING_PUBLISHED) {
        expect(
          await startCall(page, 'check_availability', {
            timeZone: 'Asia/Tokyo',
          }),
        ).toMatchObject({ ok: true, result: { status: 'ok' } });
      }
    });
  }

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
      await expect(
        dialog.getByRole('button', { name: copy.confirm }),
      ).toBeDisabled();
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

    test(`${locale}: books after the visitor fills the form, ticks consent and confirms`, async ({
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

      expect(await call).toMatchObject({
        ok: true,
        result: { status: 'booked' },
      });
      expect(posts).toHaveLength(1);
      const done = page.getByRole('dialog', {
        name: locale === 'en' ? "You're booked" : 'Llamada reservada',
      });
      await expect(done.getByRole('heading')).toBeFocused();

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

      await expect.poll(async () => (await ownerEvents(email)).length).toBe(1);
      await expect
        .poll(async () => (await sentFor(email)).length)
        .toBeGreaterThan(0);
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
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`the open dialog has no axe violations at ${viewport.width}px ${colorScheme}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme });
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
  }
});
