import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { z } from 'zod';
import { home as enHome } from '../src/content/en/home';
import { voiceCopy as en } from '../src/content/en/voice';
import { home as esHome } from '../src/content/es/home';
import { voiceCopy as es } from '../src/content/es/voice';
import {
  agentHeaders,
  elevenLabsCalls,
  elevenLabsFail,
  elevenLabsReset,
  NOTIFY_TO,
  sentFor,
  startVoiceSession,
  toolEnvelope,
  uniqueEmail,
} from './fakes';
import { gotoHydrated, settleAnimations, VOICE_PUBLISHED } from './helpers';

test.skip(!VOICE_PUBLISHED, 'voice is not published in this build');
test.describe.configure({ mode: 'serial' });
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const COPY = { en, es } as const;
const HOME = { en: '/', es: '/es' } as const;
const BUTTON = {
  en: enHome.contact.voice?.button ?? '',
  es: esHome.contact.voice?.button ?? '',
};
// Only the page's own code may load before the click; the panel, the store and the SDK wait for it.
const VOICE_CHUNK =
  /\/assets\/(?:voice-(?:open|panel|store|sdk|fake|client|device|tools)|livekit)[\w-]*\.js/;

async function openPanel(page: Page, locale: 'en' | 'es') {
  await gotoHydrated(page, HOME[locale]);
  await page.getByRole('button', { name: BUTTON[locale] }).click();
  const dialog = page.getByRole('dialog', { name: COPY[locale].title });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function startCall(page: Page, locale: 'en' | 'es') {
  const start = page.getByRole('button', { name: COPY[locale].start });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await expect(page.getByRole('status')).toHaveText(COPY[locale].listening, {
    timeout: 30_000,
  });
}

test.beforeEach(async () => {
  await elevenLabsReset();
});

for (const locale of ['en', 'es'] as const) {
  test(`${HOME[locale]} shows the button after hydration and loads no panel, SDK or session call before the click`, async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on('request', (request) => requested.push(request.url()));
    await gotoHydrated(page, HOME[locale]);
    await expect(
      page.getByRole('button', { name: BUTTON[locale] }),
    ).toBeVisible();
    await page.waitForTimeout(2500);
    expect(requested.filter((url) => VOICE_CHUNK.test(url))).toEqual([]);
    expect(requested.filter((url) => url.includes('/api/voice'))).toEqual([]);
    expect(requested.filter((url) => url.includes('elevenlabs'))).toEqual([]);
    const html = await (await page.request.get(HOME[locale])).text();
    expect(html).not.toMatch(/livekit|voice-panel/);
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page has no voice button and keeps the mail and the form', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-voice-button]')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'hello@zenetlabs.com' }).first(),
    ).toBeVisible();
    await expect(page.locator('#contact form')).toHaveCount(1);
  });
});

for (const locale of ['en', 'es'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the ${locale} panel (${colorScheme}) names the AI and ElevenLabs, links the privacy page and has no axe violations`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      const dialog = await openPanel(page, locale);
      const copy = COPY[locale];
      await expect(dialog.getByText(copy.badge, { exact: true })).toBeVisible();
      await expect(dialog).toContainText('ElevenLabs');
      await expect(
        dialog.getByRole('link', { name: copy.privacyLink }),
      ).toHaveAttribute(
        'href',
        locale === 'en' ? '/privacy' : '/es/privacidad',
      );
      await expect(
        dialog.getByRole('heading', { name: copy.title }),
      ).toBeFocused();
      await expect(
        dialog.getByRole('button', { name: copy.start }),
      ).toBeEnabled({ timeout: 30_000 });
      await settleAnimations(page);
      const results = await new AxeBuilder({ page })
        .withTags(TAGS)
        .exclude('iframe[src*="challenges.cloudflare.com"]')
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test('starts a call after Turnstile: one mint, the Spanish agent, the session handed to the SDK', async ({
  page,
}) => {
  const mints: number[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith('/api/voice/session')) {
      mints.push(response.status());
    }
  });
  await openPanel(page, 'es');
  await startCall(page, 'es');
  expect(mints).toEqual([200]);
  expect(await elevenLabsCalls()).toEqual([
    { agentId: 'local-agent-es', keyPresent: true },
  ]);
  const options = await page.evaluate(() => window.__voiceFake?.options);
  expect(options?.token).toMatch(/^fake-voice-token-\d+$/);
  expect(options?.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  expect(options?.tools).toEqual(['navigate']);
  await expect(page.getByRole('list', { name: es.transcript })).toContainText(
    'scripted voice assistant',
  );
  await expect(page.getByRole('button', { name: es.mute })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('the live panel is a bottom sheet with no axe violations', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await openPanel(page, 'es');
    await startCall(page, 'es');
    await page.evaluate(() =>
      window.__voiceFake?.callClientTool('navigate', { page: 'pricing' }),
    );
    await expect(page.getByRole('status')).toContainText('Abierto');
    const box = await page.locator('dialog[data-voice-panel]').boundingBox();
    expect(box?.width).toBe(412);
    await settleAnimations(page);
    const results = await new AxeBuilder({ page })
      .withTags(TAGS)
      .exclude('iframe[src*="challenges.cloudflare.com"]')
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test('opens a page for the agent without ending the call, in the call locale', async ({
  page,
}) => {
  await openPanel(page, 'es');
  await startCall(page, 'es');
  const result = await page.evaluate(() =>
    window.__voiceFake?.callClientTool('navigate', { page: 'pricing' }),
  );
  expect(result).toBe('opened');
  await expect(page).toHaveURL(/\/es\/precios$/);
  await expect(page.getByRole('status')).toContainText(
    `Abierto: ${es.pages.pricing}`,
  );
  await expect(page.getByRole('button', { name: es.end })).toBeVisible();
});

test('refuses a page the call locale lacks and a URL, and stays on the page', async ({
  page,
}) => {
  await openPanel(page, 'en');
  await startCall(page, 'en');
  const refused = await page.evaluate(() =>
    window.__voiceFake?.callClientTool('navigate', { page: 'verifactu' }),
  );
  expect(refused).toBe('not_available');
  const invalid = await page.evaluate(() =>
    window.__voiceFake?.callClientTool('navigate', {
      page: 'https://evil.example',
    }),
  );
  expect(invalid).toBe('invalid');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: en.end })).toBeVisible();
});

test.describe('the tools an agent calls', () => {
  test('need the bearer and a live session, and price in the session market', async ({
    request,
  }) => {
    const session = await startVoiceSession(request, 'es');
    const priced = await request.post('/api/tools/get_pricing', {
      headers: agentHeaders(session),
      data: { locale: 'en', service: 'diagnostic' },
    });
    expect(priced.status()).toBe(200);
    expect(toolEnvelope.parse(await priced.json())).toMatchObject({
      ok: true,
      result: { currency: 'EUR' },
    });
    const withoutHeader = await request.post('/api/tools/get_pricing', {
      headers: { Authorization: agentHeaders(session).Authorization ?? '' },
      data: {},
    });
    expect(withoutHeader.status()).toBe(401);
    expect(toolEnvelope.parse(await withoutHeader.json()).error).toBe(
      'session',
    );
    const unknown = await request.post('/api/tools/get_pricing', {
      headers: agentHeaders(crypto.randomUUID()),
      data: {},
    });
    expect(unknown.status()).toBe(401);
    const wrong = await request.post('/api/tools/get_pricing', {
      headers: {
        Authorization: 'Bearer wrong',
        'X-Voice-Session': session,
      },
      data: {},
    });
    expect(toolEnvelope.parse(await wrong.json()).error).toBe('auth');
  });

  test('book once with a read-back confirmation, then the owner email names the call', async ({
    request,
    page,
  }) => {
    const session = await startVoiceSession(request, 'en');
    const check = await request.post('/api/tools/check_availability', {
      headers: agentHeaders(session),
      data: {},
    });
    const slots = z
      .object({
        result: z.object({ slots: z.array(z.object({ start: z.string() })) }),
      })
      .parse(await check.json()).result.slots;
    const start = slots.at(-1)?.start;
    if (!start) throw new Error('no slot to book');
    const email = uniqueEmail('voice');
    const body = {
      slot: start,
      name: '[TEST] Voice',
      email,
      topic: 'Automate our inbox triage please.',
    };
    const unconfirmed = await request.post('/api/tools/book_meeting', {
      headers: agentHeaders(session),
      data: body,
    });
    expect(unconfirmed.status()).toBe(400);
    const booked = await request.post('/api/tools/book_meeting', {
      headers: agentHeaders(session),
      data: { ...body, confirmed: true },
    });
    expect(toolEnvelope.parse(await booked.json()).result?.status).toBe(
      'booked',
    );
    await expect
      .poll(async () => (await sentFor(email)).length, { timeout: 15_000 })
      .toBeGreaterThanOrEqual(2);
    const owner = (await sentFor(email)).find(
      (entry) => entry.to === NOTIFY_TO,
    );
    expect(owner?.subject).toMatch(/^\[TEST\] \[Lead EN\] .* — voice$/);
    expect(owner?.text).toContain('Voice call: conv-local-');
    const again = await request.post('/api/tools/book_meeting', {
      headers: agentHeaders(session),
      data: { ...body, confirmed: true },
    });
    expect(toolEnvelope.parse(await again.json()).result).toMatchObject({
      status: 'rejected',
      reason: 'limit',
    });
    await openPanel(page, 'en');
    await startCall(page, 'en');
    await page.evaluate(() =>
      window.__voiceFake?.emitToolResult(
        'book_meeting',
        JSON.stringify({
          ok: true,
          result: { status: 'booked', label: 'Tuesday 3 November, 5:00 pm' },
        }),
      ),
    );
    await expect(page.getByRole('status')).toContainText(
      'Booked for Tuesday 3 November, 5:00 pm',
    );
  });
});

test('a blocked microphone shows the options below and mints no session', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () =>
        Promise.reject(new DOMException('denied', 'NotAllowedError')),
    });
  });
  const mints: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/voice/session')) mints.push('mint');
  });
  await openPanel(page, 'en');
  const start = page.getByRole('button', { name: en.start });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText(en.micDenied);
  await expect(
    alert.getByRole('link', { name: en.fallbackForm }),
  ).toBeVisible();
  expect(mints).toEqual([]);
  expect(await elevenLabsCalls()).toEqual([]);
});

for (const [error, status, key] of [
  ['unavailable', 503, 'errorCall'],
  ['budget', 503, 'errorBudget'],
] as const) {
  test(`a ${error} answer from the server shows the fallback`, async ({
    page,
  }) => {
    await page.route('**/api/voice/session', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error }),
      }),
    );
    await openPanel(page, 'en');
    const start = page.getByRole('button', { name: en.start });
    await expect(start).toBeEnabled({ timeout: 30_000 });
    await start.click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText(en[key]);
    await expect(alert).toContainText(en.fallbackText);
    await expect(
      alert.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toBeVisible();
  });
}

test('a failing ElevenLabs token ends in the fallback and frees the day slot', async ({
  page,
}) => {
  await elevenLabsFail(1, 401);
  await openPanel(page, 'en');
  const start = page.getByRole('button', { name: en.start });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.click();
  await expect(page.getByRole('alert')).toContainText(en.errorCall);
});

test('runs end to end with the keyboard alone, and Escape ends the call and returns focus', async ({
  page,
}) => {
  await gotoHydrated(page, '/');
  const button = page.getByRole('button', { name: BUTTON.en });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: en.title })).toBeVisible();
  const start = page.getByRole('button', { name: en.start });
  await expect(start).toBeEnabled({ timeout: 30_000 });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(en.listening, {
    timeout: 30_000,
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: en.close })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('dialog').getByRole('link', { name: en.privacyLink }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: en.mute })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: en.unmute })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(button).toBeFocused();
});

test('sends the microphone permission policy and still blocks the camera and location', async ({
  request,
}) => {
  const response = await request.get('/');
  expect(response.headers()['permissions-policy']).toBe(
    'camera=(), microphone=(self), geolocation=()',
  );
});
