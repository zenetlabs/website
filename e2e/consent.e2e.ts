import AxeBuilder from '@axe-core/playwright';
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import { siteConfig } from '../site.config';
import { NOTIFY_TO, sentFor, uniqueEmail } from './fakes';
import {
  BOOKING_PUBLISHED,
  gotoHydrated,
  PAGES,
  settleAnimations,
} from './helpers';

declare global {
  interface Window {
    recordDataLayer(entry: unknown[]): void;
    bannerAt: number | null;
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

const GA_ID = siteConfig(undefined).ga4Id ?? '';
const GOOGLE = /google|gtag|doubleclick/i;
const LEGAL_NOTICE = '/es/aviso-legal';
const BANNER = '[data-consent-banner]';
const EXTERNAL = { referer: 'https://example.com/' };
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const DENIED = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};
const GRANTED = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
};

const LABELS = {
  en: {
    title: 'Cookies on Zenet Labs',
    reject: 'Reject all',
    accept: 'Accept all',
    settings: 'Settings',
    cookieSettings: 'Cookie settings',
    save: 'Save choices',
    analytics: 'Analytics',
    marketing: 'Marketing',
  },
  es: {
    title: 'Cookies en Zenet Labs',
    reject: 'Rechazar todo',
    accept: 'Aceptar todo',
    settings: 'Configurar',
    cookieSettings: 'Configuración de cookies',
    save: 'Guardar selección',
    analytics: 'Analíticas',
    marketing: 'Marketing',
  },
} as const;

type Locale = keyof typeof LABELS;

async function watch(page: Page) {
  const requests: string[] = [];
  await page.route(GOOGLE, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });
  const entries: unknown[][] = [];
  await page.exposeFunction('recordDataLayer', (entry: unknown[]) => {
    entries.push(entry);
  });
  await page.addInitScript(() => {
    const layer: unknown[] = [];
    const push = layer.push.bind(layer);
    layer.push = (...items: unknown[]) => {
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          window.recordDataLayer(Object.values(item));
        }
      }
      return push(...items);
    };
    window.dataLayer = layer;
  });
  return { requests, entries };
}

function commands(entries: unknown[][]) {
  return entries.map((entry) =>
    entry[0] === 'js' ? ['js'] : entry.slice(0, 2),
  );
}

function gtagRequests(requests: string[]) {
  return requests.filter((url) => url.includes('/gtag/js'));
}

async function gtagLoaded(requests: string[]) {
  await expect.poll(() => gtagRequests(requests).length).toBeGreaterThan(0);
}

async function stored(page: Page, key: string) {
  return page.evaluate((name) => localStorage.getItem(name), key);
}

function footerButton(page: Page, locale: Locale = 'en') {
  return page.getByRole('link', { name: LABELS[locale].cookieSettings });
}

async function openSettings(page: Page, locale: Locale = 'en') {
  await page.locator('#cookie-settings').waitFor({ state: 'attached' });
  await footerButton(page, locale).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function saveChoices(dialog: Locator, locale: Locale = 'en') {
  await dialog.getByRole('button', { name: LABELS[locale].save }).click();
  await expect(dialog).toBeHidden();
}

async function settled(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function clickBanner(
  page: Page,
  button: 'accept' | 'reject',
  locale: Locale = 'en',
) {
  const banner = page.locator(BANNER);
  await expect(banner).toBeVisible();
  await banner.getByRole('button', { name: LABELS[locale][button] }).click();
  await expect(banner).toBeHidden();
}

async function cookieNames(context: BrowserContext) {
  return (await context.cookies()).map((cookie) => cookie.name);
}

test.describe('first visit', () => {
  for (const [locale, path] of [
    ['en', '/'],
    ['es', '/es'],
  ] as const) {
    test(`${path} asks, loads nothing and sets only the denied defaults`, async ({
      page,
      context,
    }) => {
      const { requests, entries } = await watch(page);
      await gotoHydrated(page, path);
      await expect(page.locator(BANNER)).toBeVisible();
      await expect(
        page.getByRole('region', { name: LABELS[locale].title }),
      ).toBeVisible();
      await settled(page);
      expect(requests).toEqual([]);
      expect(entries).toEqual([['consent', 'default', DENIED]]);
      expect(await cookieNames(context)).toEqual([]);
      expect(await stored(page, 'zenet-consent')).toBeNull();
    });
  }
});

test.describe('choices', () => {
  test('reject: remembers, stays quiet after a reload, and reopens from the footer', async ({
    page,
  }) => {
    const { requests } = await watch(page);
    await gotoHydrated(page, '/');
    await clickBanner(page, 'reject');
    expect(
      JSON.parse((await stored(page, 'zenet-consent')) ?? '{}'),
    ).toMatchObject({ analytics: false, marketing: false, revision: 1 });
    await page.reload();
    await page.waitForSelector('body[data-hydrated="true"]');
    await settled(page);
    await expect(page.locator(BANNER)).toHaveCount(0);
    expect(requests).toEqual([]);

    const dialog = await openSettings(page);
    await expect(
      dialog.getByRole('checkbox', { name: LABELS.en.analytics }),
    ).not.toBeChecked();
    await expect(
      dialog.getByRole('checkbox', { name: LABELS.en.marketing }),
    ).not.toBeChecked();
  });

  test('accept: grants every signal, queues the tag in order, loads gtag.js once and records the first touch', async ({
    page,
  }) => {
    const { requests, entries } = await watch(page);
    await gotoHydrated(page, '/pricing?utm_source=e2e&gclid=g1', EXTERNAL);
    await clickBanner(page, 'accept');
    await gtagLoaded(requests);
    await settled(page);

    expect(gtagRequests(requests)).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
    ]);
    expect(commands(entries)).toEqual([
      ['consent', 'default'],
      ['consent', 'update'],
      ['js'],
      ['config', GA_ID],
      ['event', 'pricing_view'],
    ]);
    expect(entries[1]?.[2]).toEqual(GRANTED);
    expect(
      JSON.parse((await stored(page, 'zenet-first-touch')) ?? '{}'),
    ).toMatchObject({
      landing: '/pricing?utm_source=e2e&gclid=g1',
      referrer: 'https://example.com/',
    });
  });

  test('accept: a returning visitor is not asked again and the tag loads after the page', async ({
    page,
  }) => {
    const { requests, entries } = await watch(page);
    await gotoHydrated(page, '/');
    await clickBanner(page, 'accept');
    await gtagLoaded(requests);
    requests.length = 0;
    entries.length = 0;

    await page.reload();
    await gtagLoaded(requests);
    await expect(page.locator(BANNER)).toHaveCount(0);
    expect(commands(entries)).toEqual([
      ['consent', 'default'],
      ['consent', 'update'],
      ['js'],
      ['config', GA_ID],
    ]);
    expect(gtagRequests(requests)).toHaveLength(1);
  });

  test('analytics only: loads the tag, keeps ad signals denied, stores no first touch', async ({
    page,
  }) => {
    const { requests, entries } = await watch(page);
    await gotoHydrated(page, '/', EXTERNAL);
    await clickBanner(page, 'reject');
    const dialog = await openSettings(page);
    await dialog.getByRole('checkbox', { name: LABELS.en.analytics }).check();
    await saveChoices(dialog);
    await gtagLoaded(requests);
    expect(gtagRequests(requests)).toHaveLength(1);
    expect(
      entries.filter((entry) => entry[1] === 'update').at(-1)?.[2],
    ).toEqual({
      ...DENIED,
      analytics_storage: 'granted',
    });
    expect(await stored(page, 'zenet-first-touch')).toBeNull();
  });

  test('marketing only: loads no Google request but stores the first touch', async ({
    page,
  }) => {
    const { requests } = await watch(page);
    await gotoHydrated(page, '/?utm_source=ads', EXTERNAL);
    await clickBanner(page, 'reject');
    const dialog = await openSettings(page);
    await dialog.getByRole('checkbox', { name: LABELS.en.marketing }).check();
    await saveChoices(dialog);
    await settled(page);
    expect(requests).toEqual([]);
    expect(
      JSON.parse((await stored(page, 'zenet-first-touch')) ?? '{}'),
    ).toMatchObject({ landing: '/?utm_source=ads' });
  });

  test('a choice made after an internal navigation is not stored as a first touch', async ({
    page,
  }) => {
    await watch(page);
    await gotoHydrated(page, '/?utm_source=ads', EXTERNAL);
    await clickBanner(page, 'reject');
    await page.getByRole('link', { name: 'Pricing' }).first().click();
    await page.waitForSelector('body[data-hydrated="true"]');
    const dialog = await openSettings(page);
    await dialog.getByRole('checkbox', { name: LABELS.en.marketing }).check();
    await saveChoices(dialog);
    expect(await stored(page, 'zenet-first-touch')).toBeNull();
  });

  test('withdrawing in one tab switches tracking off in another and deletes its cookies', async ({
    context,
    baseURL,
  }) => {
    const first = await context.newPage();
    const second = await context.newPage();
    const { requests } = await watch(first);
    await watch(second);
    await gotoHydrated(first, '/');
    await clickBanner(first, 'accept');
    await gtagLoaded(requests);
    await gotoHydrated(second, '/');
    await expect(second.locator(BANNER)).toHaveCount(0);
    await expect
      .poll(() => second.evaluate(() => window.zenetTracking))
      .toBe(true);
    await context.addCookies([
      { name: '_ga', value: 'GA1.1.1.1', url: baseURL ?? '' },
      { name: '_gcl_au', value: '1.1', url: baseURL ?? '' },
      { name: 'keep', value: '1', url: baseURL ?? '' },
    ]);

    const dialog = await openSettings(first);
    await dialog.getByRole('checkbox', { name: LABELS.en.analytics }).uncheck();
    await dialog.getByRole('checkbox', { name: LABELS.en.marketing }).uncheck();
    await saveChoices(dialog);

    await expect
      .poll(() => second.evaluate(() => window.zenetTracking))
      .toBe(false);
    expect(
      await second.evaluate(
        (id) => Reflect.get(window, `ga-disable-${id}`),
        GA_ID,
      ),
    ).toBe(true);
    await expect.poll(() => cookieNames(context)).toEqual(['keep']);
  });

  test('withdrawing on the same page disables GA, deletes its cookies and the first touch', async ({
    page,
    context,
    baseURL,
  }) => {
    const { requests } = await watch(page);
    await gotoHydrated(page, '/', EXTERNAL);
    await clickBanner(page, 'accept');
    await gtagLoaded(requests);
    await context.addCookies([
      { name: '_ga', value: 'GA1.1.1.1', url: baseURL ?? '' },
      { name: '_ga_TEST', value: 'GS2.1.s1', url: baseURL ?? '' },
      { name: 'keep', value: '1', url: baseURL ?? '' },
    ]);
    expect(await stored(page, 'zenet-first-touch')).not.toBeNull();

    const dialog = await openSettings(page);
    await dialog.getByRole('checkbox', { name: LABELS.en.analytics }).uncheck();
    await dialog.getByRole('checkbox', { name: LABELS.en.marketing }).uncheck();
    await saveChoices(dialog);

    expect(
      await page.evaluate(
        (id) => Reflect.get(window, `ga-disable-${id}`),
        GA_ID,
      ),
    ).toBe(true);
    await expect.poll(() => cookieNames(context)).toEqual(['keep']);
    expect(await stored(page, 'zenet-first-touch')).toBeNull();

    requests.length = 0;
    await page.reload();
    await page.waitForSelector('body[data-hydrated="true"]');
    await settled(page);
    expect(requests).toEqual([]);
  });
});

test.describe('events', () => {
  test('a consented visitor records CTA clicks and the language switch', async ({
    page,
  }) => {
    const { requests, entries } = await watch(page);
    await gotoHydrated(page, '/');
    await clickBanner(page, 'accept');
    await gtagLoaded(requests);

    await page.locator('a[data-cta="hero"]').click();
    expect(entries).toContainEqual(['event', 'cta_click', { cta_id: 'hero' }]);
    if (BOOKING_PUBLISHED) {
      await page.waitForURL('**/book');
      await page.waitForFunction(() => window.zenetTracking === true);
    }

    await page
      .getByRole('navigation', { name: 'Language', exact: true })
      .getByRole('link', { name: 'ES' })
      .click();
    await page.waitForURL(BOOKING_PUBLISHED ? '**/es/reservar' : '**/es');
    expect(entries).toContainEqual(['event', 'language_switch', undefined]);
  });

  test('a rejecting visitor records nothing', async ({ page }) => {
    const { requests, entries } = await watch(page);
    await gotoHydrated(page, '/');
    await clickBanner(page, 'reject');
    await page.locator('a[data-cta="hero"]').click();
    await page
      .getByRole('navigation', { name: 'Language', exact: true })
      .getByRole('link', { name: 'ES' })
      .click();
    await page.waitForURL(BOOKING_PUBLISHED ? '**/es/reservar' : '**/es');
    await settled(page);
    expect(entries.filter((entry) => entry[0] === 'event')).toEqual([]);
    expect(requests).toEqual([]);
  });

  test('every booking CTA on every page is tracked', async ({ request }) => {
    for (const path of PAGES.filter((entry) => entry !== LEGAL_NOTICE)) {
      const html = await (await request.get(path)).text();
      const anchors = (html.match(/<a\b[^>]*>/g) ?? []).filter((tag) =>
        /href="(?:\/es)?\/?#contact"|href="(?:\/book|\/es\/reservar)"/.test(
          tag,
        ),
      );
      for (const tag of anchors.filter((tag) => !tag.includes('hrefLang'))) {
        expect(tag, `${path} ${tag}`).toContain('data-cta="');
      }
    }
  });
});

test.describe('leads', () => {
  async function fillAndSend(page: Page, email: string) {
    await page.getByLabel('Name').focus();
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email').fill(email);
    await page
      .getByLabel('What should we look at?')
      .fill('Please automate our inbox triage today.');
    await page.getByRole('checkbox').check();
    const send = page.getByRole('button', { name: 'Send message' });
    await expect(send).toBeEnabled({ timeout: 30_000 });
    await send.click();
    await expect(page.getByText('Message sent')).toBeVisible({
      timeout: 30_000,
    });
  }

  test('with marketing consent the lead carries the first touch, not the submit page load', async ({
    page,
  }) => {
    await watch(page);
    const email = uniqueEmail('first-touch');
    await gotoHydrated(
      page,
      '/pricing?utm_source=e2e-first&gclid=g1',
      EXTERNAL,
    );
    await clickBanner(page, 'accept');
    await gotoHydrated(page, '/?utm_source=later');
    await fillAndSend(page, email);
    await expect.poll(async () => (await sentFor(email)).length).toBe(2);
    const owner = (await sentFor(email)).find(
      (entry) => entry.to === NOTIFY_TO,
    );
    expect(owner?.text).toContain(
      'Landing page: /pricing?utm_source=e2e-first&gclid=g1',
    );
    expect(owner?.text).toContain('source=e2e-first');
    expect(owner?.text).toContain('gclid: g1');
    expect(owner?.text).toContain('Submitted from: /');
  });

  test('after a rejection the lead describes only the page load it was sent from', async ({
    page,
  }) => {
    await watch(page);
    const email = uniqueEmail('rejected');
    await gotoHydrated(page, '/pricing?utm_source=e2e-first', EXTERNAL);
    await clickBanner(page, 'reject');
    await gotoHydrated(page, '/?utm_source=later');
    await fillAndSend(page, email);
    await expect.poll(async () => (await sentFor(email)).length).toBe(2);
    const owner = (await sentFor(email)).find(
      (entry) => entry.to === NOTIFY_TO,
    );
    expect(owner?.text).toContain('Landing page: /?utm_source=later');
    expect(owner?.text).not.toContain('e2e-first');
  });
});

test.describe('accessibility', () => {
  const VIEWPORTS = [
    { width: 412, height: 915 },
    { width: 1280, height: 900 },
  ];

  for (const viewport of VIEWPORTS) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`banner and dialog have no axe violations at ${viewport.width}px ${colorScheme}`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          viewport,
          colorScheme,
          storageState: { cookies: [], origins: [] },
        });
        const page = await context.newPage();
        await watch(page);
        await gotoHydrated(page, '/');
        await expect(page.locator(BANNER)).toBeVisible();
        await settleAnimations(page);
        const scan = () =>
          new AxeBuilder({ page })
            .withTags(TAGS)
            .exclude('iframe[src*="challenges.cloudflare.com"]')
            .analyze();
        expect((await scan()).violations).toEqual([]);

        await page
          .locator(BANNER)
          .getByRole('button', { name: LABELS.en.settings })
          .click();
        await expect(page.getByRole('dialog')).toBeVisible();
        expect((await scan()).violations).toEqual([]);
        await context.close();
      });
    }
  }

  test('keyboard: the banner is next after the skip link, and Settings opens a modal that returns focus', async ({
    page,
  }) => {
    await watch(page);
    await gotoHydrated(page, '/');
    const banner = page.locator(BANNER);
    await expect(banner).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('a[href="#main"]')).toBeFocused();
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('[data-consent-banner]'),
      ),
    ).toBe(true);

    const settings = banner.getByRole('button', { name: LABELS.en.settings });
    await settings.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('checkbox', { name: LABELS.en.analytics }),
    ).toBeFocused();
    expect(await dialog.evaluate((element) => element.matches(':modal'))).toBe(
      true,
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(settings).toBeFocused();
  });

  test('keyboard: Escape from the footer button returns focus to it', async ({
    page,
  }) => {
    await watch(page);
    await gotoHydrated(page, '/');
    await clickBanner(page, 'reject');
    const button = footerButton(page);
    await page.locator('#cookie-settings').waitFor({ state: 'attached' });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(button).toBeFocused();
  });

  test('Reject and Accept look identical', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS[0] ?? { width: 412, height: 915 });
    await watch(page);
    await gotoHydrated(page, '/');
    const banner = page.locator(BANNER);
    await expect(banner).toBeVisible();
    const measure = (name: string) =>
      banner.getByRole('button', { name }).evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          backgroundColor: style.backgroundColor,
          color: style.color,
          padding: style.padding,
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      });
    expect(await measure(LABELS.en.reject)).toEqual(
      await measure(LABELS.en.accept),
    );
  });

  for (const viewport of VIEWPORTS) {
    test(`the banner never hides a focused footer link at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await watch(page);
      await gotoHydrated(page, '/');
      await expect(page.locator(BANNER)).toBeVisible();
      const fit = await page.evaluate(() => ({
        banner:
          document
            .querySelector('[data-consent-banner]')
            ?.getBoundingClientRect().height ?? 0,
        reserve: Number.parseFloat(
          getComputedStyle(document.body).paddingBottom,
        ),
      }));
      expect(fit.banner).toBeGreaterThan(0);
      expect(fit.banner).toBeLessThanOrEqual(fit.reserve);

      const targets = page.locator('footer a, footer button');
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        await targets.nth(index).focus();
        const visible = await targets.nth(index).evaluate((element) => {
          const box = element.getBoundingClientRect();
          const top = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return top !== null && element.contains(top);
        });
        expect(visible, `footer target ${index}`).toBe(true);
      }
    });
  }
});

test.describe('layout stability', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  for (const path of ['/', '/pricing', '/es/privacidad']) {
    test(`${path}: the banner is not the LCP element and shifts nothing when it appears`, async ({
      page,
    }) => {
      await watch(page);
      await page.addInitScript(() => {
        window.bannerAt = null;
        new MutationObserver(() => {
          if (
            window.bannerAt === null &&
            document.querySelector('[data-consent-banner]')
          ) {
            window.bannerAt = performance.now();
          }
        }).observe(document, { childList: true, subtree: true });
      });
      await gotoHydrated(page, path);
      await expect(page.locator(BANNER)).toBeVisible();
      await settled(page);
      const result = await page.evaluate(
        () =>
          new Promise<{ lcpInBanner: boolean; shift: number }>((resolve) => {
            let element: Element | null = null;
            let shift = 0;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry instanceof LargestContentfulPaint) {
                  element = entry.element;
                }
              }
            }).observe({ type: 'largest-contentful-paint', buffered: true });
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (
                  window.bannerAt !== null &&
                  entry.startTime >= window.bannerAt &&
                  'hadRecentInput' in entry &&
                  entry.hadRecentInput === false &&
                  'value' in entry &&
                  typeof entry.value === 'number'
                ) {
                  shift += entry.value;
                }
              }
            }).observe({ type: 'layout-shift', buffered: true });
            setTimeout(
              () =>
                resolve({
                  lcpInBanner:
                    element?.closest('[data-consent-banner]') != null,
                  shift,
                }),
              300,
            );
          }),
      );
      expect(result.lcpInBanner).toBe(false);
      expect(result.shift).toBe(0);
    });
  }
});
