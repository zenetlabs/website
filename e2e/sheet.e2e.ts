import {
  type CDPSession,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import { chatCopy as en } from '../src/content/en/chat';
import { home } from '../src/content/en/home';
import { voiceCopy as voiceEn } from '../src/content/en/voice';
import {
  ASSISTANT_PUBLISHED,
  gotoHydrated,
  settleAnimations,
  VOICE_PUBLISHED,
} from './helpers';

// Drag to dismiss the phone sheets, driven by real touch input, so the
// handle's `touch-action` and the list's native scroll are both in play.
test.describe.configure({ mode: 'serial' });
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

const LAUNCHER = 'Open the AI assistant';
const CHAT = 'dialog[data-chat-panel]';
const VOICE = 'dialog[data-voice-panel]';
const STEP_MS = 16;

type Touch = { x: number; y: number };

async function touch(
  cdp: CDPSession,
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: Touch[],
) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(({ x, y }) => ({ x, y, id: 1 })),
  });
}

// A finger from `from` down by `distance` px over `ms`, resting `rest` ms
// before it lets go (a resting finger throws nothing).
async function swipe(
  page: Page,
  from: Touch,
  distance: number,
  { ms = 400, rest = 150 }: { ms?: number; rest?: number } = {},
) {
  const cdp = await page.context().newCDPSession(page);
  const steps = Math.max(2, Math.round(ms / STEP_MS));
  await touch(cdp, 'touchStart', [from]);
  for (let step = 1; step <= steps; step += 1) {
    await page.waitForTimeout(STEP_MS);
    await touch(cdp, 'touchMove', [
      { x: from.x, y: from.y + (distance * step) / steps },
    ]);
  }
  if (rest > 0) await page.waitForTimeout(rest);
  await touch(cdp, 'touchEnd', []);
  await cdp.detach();
}

async function grabber(sheet: Locator): Promise<Touch> {
  const box = await sheet.boundingBox();
  if (!box) throw new Error('the sheet has no box');
  return { x: box.x + box.width / 2, y: box.y + 10 };
}

async function sheetHeight(sheet: Locator): Promise<number> {
  const box = await sheet.boundingBox();
  if (!box) throw new Error('the sheet has no box');
  return box.height;
}

async function sheetTop(page: Page, selector: string): Promise<number> {
  return page.evaluate(
    (css) => document.querySelector(css)?.getBoundingClientRect().top ?? -1,
    selector,
  );
}

async function openChat(page: Page) {
  await gotoHydrated(page, '/');
  await page.getByRole('button', { name: LAUNCHER }).click();
  const sheet = page.locator(CHAT);
  await expect(sheet).toBeVisible();
  await settleAnimations(page);
  return sheet;
}

test.describe('the chat sheet', () => {
  test.skip(!ASSISTANT_PUBLISHED, 'the assistant is not published');

  test('springs back from a short drag', async ({ page }) => {
    const sheet = await openChat(page);
    const top = await sheetTop(page, CHAT);
    await swipe(page, await grabber(sheet), (await sheetHeight(sheet)) * 0.1);
    await settleAnimations(page);
    await expect(sheet).toBeVisible();
    expect(await sheetTop(page, CHAT)).toBeCloseTo(top, 0);
    await expect(sheet).not.toHaveAttribute('style', /transform/);
  });

  test('closes past a quarter and gives focus back to the launcher', async ({
    page,
  }) => {
    const sheet = await openChat(page);
    await swipe(page, await grabber(sheet), (await sheetHeight(sheet)) * 0.4);
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('button', { name: LAUNCHER })).toBeFocused();
  });

  // A smoke test: the thresholds themselves are unit-tested in sheet-drag.
  test('closes on a short fast flick', async ({ page }) => {
    const sheet = await openChat(page);
    await swipe(page, await grabber(sheet), 150, { ms: 40, rest: 0 });
    await expect(sheet).toHaveCount(0);
  });

  test('a drag in the conversation scrolls it and leaves the sheet in place', async ({
    page,
  }) => {
    const sheet = await openChat(page);
    const top = await sheetTop(page, CHAT);
    const list = sheet.locator('.chat-scroll');
    // Enough to scroll: the conversation grows from the bottom.
    await list.evaluate((element) => {
      element.firstElementChild?.setAttribute('style', 'padding-top: 2000px');
    });
    const before = await list.evaluate((element) => element.scrollTop);
    const box = await list.boundingBox();
    if (!box) throw new Error('no list');
    await swipe(
      page,
      { x: box.x + box.width / 2, y: box.y + 40 },
      box.height * 0.6,
    );
    await settleAnimations(page);
    expect(await list.evaluate((element) => element.scrollTop)).toBeLessThan(
      before,
    );
    expect(await sheetTop(page, CHAT)).toBeCloseTo(top, 0);
    await expect(sheet).toBeVisible();
  });

  test('a finger during the rise catches the sheet where it is', async ({
    page,
  }) => {
    await gotoHydrated(page, '/');
    // Every motion the panel starts is frozen at 15% the moment it is created,
    // so the touch always lands on a sheet that is still rising.
    await page.evaluate(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function frozen(frames, options) {
        const animation = animate.call(this, frames, options);
        if (this.closest('dialog[data-chat-panel]')) {
          const { duration } = animation.effect?.getTiming() ?? {};
          animation.pause();
          animation.currentTime =
            typeof duration === 'number' ? duration * 0.15 : 0;
        }
        return animation;
      };
      window.addEventListener(
        'sheet-unfreeze',
        () => {
          Element.prototype.animate = animate;
        },
        { once: true },
      );
    });
    await page.locator('.desk-chip').first().click();
    const sheet = page.locator(CHAT);
    await expect(sheet).toBeVisible();
    await page.evaluate(() => dispatchEvent(new Event('sheet-unfreeze')));
    const top = await sheetTop(page, CHAT);
    expect(top).toBeGreaterThan(100);
    const header = await sheet.locator('header').boundingBox();
    if (!header) throw new Error('no header');
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', [
      { x: header.x + header.width / 2, y: header.y + header.height / 2 },
    ]);
    // Caught: the rise on the sheet and its content is gone (the backdrop now
    // follows the drag), and the drag holds the sheet where the rise left it.
    const held = await page.evaluate((css) => {
      const dialog = document.querySelector(css);
      if (!(dialog instanceof HTMLElement)) return null;
      const rising = dialog
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            animation.effect.pseudoElement === null &&
            !('animationName' in animation) &&
            !('transitionProperty' in animation),
        );
      return { rising: rising.length, transform: dialog.style.transform };
    }, CHAT);
    expect(held?.rising).toBe(0);
    expect(held?.transform).toMatch(/^translateY\(/);
    expect(await sheetTop(page, CHAT)).toBeCloseTo(top, 0);
    await touch(cdp, 'touchEnd', []);
    await cdp.detach();
    await settleAnimations(page);
    await expect(sheet).toBeVisible();
    expect(await sheetTop(page, CHAT)).toBeCloseTo(12, 0);
  });

  test('under reduced motion the release snaps, with nothing left running', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const sheet = await openChat(page);
    const top = await sheetTop(page, CHAT);
    await swipe(page, await grabber(sheet), (await sheetHeight(sheet)) * 0.1);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    expect(await sheetTop(page, CHAT)).toBeCloseTo(top, 0);
    await swipe(page, await grabber(sheet), (await sheetHeight(sheet)) * 0.4);
    await expect(sheet).toHaveCount(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });

  test('nothing drags on a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const sheet = await openChat(page);
    await expect(sheet.locator('.sheet-grabber')).toBeHidden();
    const box = await sheet.locator('header').boundingBox();
    if (!box) throw new Error('no header');
    await page.mouse.move(box.x + 40, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 40, box.y + 400, { steps: 10 });
    await page.mouse.up();
    await expect(sheet).toBeVisible();
    await expect(sheet).not.toHaveAttribute('style', /transform/);
    expect(await sheetTop(page, CHAT)).toBe(0);
  });

  test('the close button and Escape still close it', async ({ page }) => {
    const sheet = await openChat(page);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await page.getByRole('button', { name: LAUNCHER }).click();
    await settleAnimations(page);
    await page.locator(CHAT).getByRole('button', { name: en.close }).click();
    await expect(page.locator(CHAT)).toHaveCount(0);
  });
});

test.describe('the voice sheet', () => {
  test.skip(!VOICE_PUBLISHED, 'voice is not published');

  async function openVoice(page: Page) {
    await gotoHydrated(page, '/');
    await page
      .getByRole('link', { name: home.desk.call?.button ?? '', exact: true })
      .click();
    const sheet = page.locator(VOICE);
    await expect(sheet).toBeVisible();
    // The sheet grows by a row once the challenge mounts: wait for its size.
    await expect(page.getByRole('button', { name: voiceEn.start })).toBeEnabled(
      { timeout: 30_000 },
    );
    return sheet;
  }

  test('closes from the intro when dragged down', async ({ page }) => {
    const sheet = await openVoice(page);
    await swipe(page, await grabber(sheet), (await sheetHeight(sheet)) * 0.6);
    await expect(sheet).toHaveCount(0);
  });

  test('lifting resists and never climbs more than 24px', async ({ page }) => {
    const sheet = await openVoice(page);
    const top = await sheetTop(page, VOICE);
    const from = await grabber(sheet);
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', [from]);
    for (const y of [from.y - 40, from.y - 120, from.y - 300]) {
      await page.waitForTimeout(STEP_MS);
      await touch(cdp, 'touchMove', [{ x: from.x, y }]);
    }
    const lifted = top - (await sheetTop(page, VOICE));
    expect(lifted).toBeGreaterThan(8);
    expect(lifted).toBeLessThanOrEqual(24);
    await touch(cdp, 'touchEnd', []);
    await cdp.detach();
    await settleAnimations(page);
    expect(await sheetTop(page, VOICE)).toBeCloseTo(top, 0);
  });

  test('a live call only gives a little and keeps going', async ({ page }) => {
    const sheet = await openVoice(page);
    await page.getByRole('button', { name: voiceEn.start }).click();
    const status = sheet.getByRole('status');
    await expect(status).toHaveText(voiceEn.listening, { timeout: 30_000 });
    const top = await sheetTop(page, VOICE);
    const from = await grabber(sheet);
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', [from]);
    const height = await sheetHeight(sheet);
    for (let step = 1; step <= 10; step += 1) {
      await page.waitForTimeout(STEP_MS);
      await touch(cdp, 'touchMove', [
        { x: from.x, y: from.y + (height * 0.6 * step) / 10 },
      ]);
    }
    expect((await sheetTop(page, VOICE)) - top).toBeLessThanOrEqual(24);
    await touch(cdp, 'touchEnd', []);
    await cdp.detach();
    await settleAnimations(page);
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute('data-voice-state', 'live');
    await expect(status).toHaveText(voiceEn.listening);
    expect(await sheetTop(page, VOICE)).toBeCloseTo(top, 0);
    await sheet.getByRole('button', { name: voiceEn.end }).click();
  });
});
