import { expect, type Page, test } from '@playwright/test';
import { home as en } from '../src/content/en/home';
import {
  ASSISTANT_PUBLISHED,
  BOOKING_PUBLISHED,
  gotoHydrated,
} from './helpers';

const { desk } = en;

const OBSERVER = `
  window.__layoutShift = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__layoutShift += entry.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

declare global {
  interface Window {
    __layoutShift?: number;
  }
}

function chatDialog(page: Page) {
  return page.locator('dialog[data-chat-panel]');
}

test.describe('the desk slots', () => {
  test.skip(!BOOKING_PUBLISHED, 'booking is not published in this build');

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`arrive after load at ${viewport.width}px without shifting anything`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(OBSERVER);
      await gotoHydrated(page, '/');
      await page.locator('[data-desk]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-desk] .slot-chip').first()).toBeVisible({
        timeout: 15_000,
      });
      expect(
        await page.locator('[data-desk] .slot-chip').count(),
      ).toBeLessThanOrEqual(3);
      await expect(page.locator('[data-desk] [data-slot-meta]')).toContainText(
        desk.slots.timesIn.replace('{zone}', ''),
      );
      expect(await page.evaluate(() => window.__layoutShift)).toBe(0);
    });
  }

  test('a slot chip opens /book with that time already picked', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    const chip = page.locator('[data-desk] .slot-chip').first();
    await expect(chip).toBeVisible({ timeout: 15_000 });
    const href = (await chip.getAttribute('href')) ?? '';
    const start = Number(new URL(href, 'http://x').searchParams.get('slot'));
    expect(href).toMatch(/^\/book\?slot=\d+$/);
    await chip.click();
    await expect(page).toHaveURL(href);
    await expect(
      page.locator(
        `input[name="slot"][value="${new Date(start).toISOString()}"]`,
      ),
    ).toBeChecked({ timeout: 15_000 });
  });

  test('a failed fetch leaves one link to all times and no spinner', async ({
    page,
  }) => {
    await page.route('**/api/book/slots', (route) =>
      route.fulfill({ status: 500, body: '' }),
    );
    await gotoHydrated(page, '/');
    const rail = page.locator('[data-desk] [data-slot-rail]');
    await expect(rail.locator('[data-slot-fallback="failed"]')).toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(
      rail.getByRole('link', { name: desk.slots.seeAvailable }),
    ).toHaveAttribute('href', '/book');
    await expect(rail.locator('.slot-chip')).toHaveCount(0);
    await expect(
      rail.locator('[role="progressbar"], [aria-busy="true"]'),
    ).toHaveCount(0);
  });

  test('only one request asks for slots, even with both the desk and the close card', async ({
    page,
  }) => {
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/book/slots')) asked.push(request.url());
    });
    await gotoHydrated(page, '/');
    await expect(page.locator('[data-desk] .slot-chip').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('#contact .slot-chip').first()).toBeAttached();
    expect(asked).toHaveLength(1);
  });
});

test.describe('the desk chat', () => {
  test.skip(
    !ASSISTANT_PUBLISHED,
    'the assistant is not published in this build',
  );
  test.describe.configure({ mode: 'serial' });

  test('the desk names the AI assistant, with its badge and greeting, from the server render', async ({
    page,
  }) => {
    await page.goto('/');
    const head = page.locator('[data-desk]');
    await expect(
      head.getByRole('heading', { name: desk.intro.title }),
    ).toBeVisible();
    await expect(head.locator('.desk-badge')).toHaveText(desk.intro.badge);
    await expect(head.locator('.desk-bubble')).toContainText(
      desk.intro.welcome,
    );
    await expect(head).not.toContainText(desk.human.title);
  });

  test('a chip opens the chat from the desk with the question already sent', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    await page.getByRole('link', { name: desk.intro.suggestions[0] }).click();
    const dialog = chatDialog(page);
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect(dialog.getByRole('log')).toContainText(
      desk.intro.suggestions[0],
    );
    await expect(dialog).toHaveAttribute('data-chat-state', 'idle', {
      timeout: 30_000,
    });
    await expect(
      dialog.locator('[data-ai-generated="true"]').first(),
    ).toBeVisible();
  });

  test('the composer sends what the visitor typed', async ({ page }) => {
    await gotoHydrated(page, '/');
    const box = page.getByLabel(desk.label);
    await box.fill('What does the automation diagnostic include?');
    await box.press('Enter');
    const dialog = chatDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('log')).toContainText(
      'What does the automation diagnostic include?',
    );
    await expect(box).toHaveValue('');
  });

  test('under reduced motion the panel swaps in with no animation', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoHydrated(page, '/');
    await page.getByRole('link', { name: desk.intro.suggestions[1] }).click();
    await expect(chatDialog(page)).toBeVisible();
    // Colour transitions may run; nothing moves.
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => !(animation instanceof CSSTransition))
            .length,
      ),
    ).toBe(0);
  });

  test('with motion the panel grows from the desk and settles in place', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    await page.getByRole('link', { name: desk.intro.suggestions[1] }).click();
    const dialog = chatDialog(page);
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(400);
    expect(
      await dialog.evaluate((node) => getComputedStyle(node).transform),
    ).toBe('none');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
