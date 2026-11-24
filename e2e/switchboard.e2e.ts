import { expect, type Page, test } from '@playwright/test';
import { home as enHome } from '../src/content/en/home';
import {
  ASSISTANT_PUBLISHED,
  OBSERVER,
  settleAnimations,
  waitForHydration,
} from './helpers';

// The only spec that plays the home hero's intro: it imports Playwright's own
// `test`, without the fixture that stills the scene everywhere else.
const STAGE = '[data-switchboard]';
const BUTTON = `${STAGE} [data-sb-button]`;

async function intro(page: Page) {
  return page.locator(STAGE).getAttribute('data-intro');
}

// The scene's own animations, not a press transition
async function running(page: Page) {
  return page.evaluate(
    (selector) =>
      document
        .querySelector(selector)
        ?.getAnimations({ subtree: true })
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.playState === 'running',
        ).length ?? 0,
    STAGE,
  );
}

async function deskVisibility(page: Page) {
  return page
    .locator('[data-desk]')
    .evaluate((desk) => getComputedStyle(desk).visibility);
}

const LCP = `
  window.__lcp = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__lcp.push(entry.element ? entry.element.tagName : null);
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
`;

declare global {
  interface Window {
    __lcp?: Array<string | null>;
  }
}

async function endState(page: Page) {
  return page.evaluate(() => {
    const css = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element) : null;
    };
    return {
      desk: {
        opacity: css('[data-desk]')?.opacity,
        transform: css('[data-desk]')?.transform,
        scale: css('[data-desk]')?.scale,
        visibility: css('[data-desk]')?.visibility,
      },
      nodes: [...document.querySelectorAll('.sb-node')].map(
        (node) => getComputedStyle(node).opacity,
      ),
      captions: [...document.querySelectorAll('.sb-job')].map(
        (job) => getComputedStyle(job).opacity,
      ),
    };
  });
}

async function expectEndState(page: Page, width: number, replay: string) {
  const end = await endState(page);
  expect(end.desk).toEqual({
    opacity: '1',
    transform: 'none',
    scale: 'none',
    visibility: 'visible',
  });
  const resting = width >= 1024 ? ['0.4'] : ['0', '0.6'];
  for (const opacity of end.nodes) expect(resting).toContain(opacity);
  expect(end.captions).toEqual(['0', '0', '0']);
  expect(await running(page)).toBe(0);
  await expect(page.locator(BUTTON)).toHaveAccessibleName(replay);
}

const REPLAY = { '/': 'Replay the animation', '/es': 'Repetir la animación' };

async function finishIntro(page: Page) {
  await page.locator(STAGE).evaluate((stage) => {
    for (const animation of stage.getAnimations({ subtree: true })) {
      animation.finish();
    }
  });
}

for (const { width, height, path } of [
  { width: 1280, height: 800, path: '/' },
  { width: 390, height: 844, path: '/' },
  { width: 390, height: 844, path: '/es' },
] as const) {
  test(`${path} at ${width} plays once in real time and ends in the desk, with no shift and the h1 as the LCP`, async ({
    page,
  }) => {
    test.setTimeout(40_000);
    await page.setViewportSize({ width, height });
    await page.addInitScript(OBSERVER);
    await page.addInitScript(LCP);
    await page.goto(path);
    await waitForHydration(page);
    expect(await intro(page)).toBe('play');
    expect(await running(page)).toBeGreaterThan(0);
    expect(await deskVisibility(page)).toBe('hidden');
    await page
      .locator(STAGE)
      .evaluate((stage) =>
        Promise.all(
          stage
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished),
        ),
      );
    await expectEndState(page, width, REPLAY[path]);
    expect(await page.evaluate(() => window.__layoutShift)).toBe(0);
    expect(await page.evaluate(() => window.__lcp?.at(-1))).toBe('H1');
  });
}

test('/es at 1280 ends in the desk', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/es');
  await waitForHydration(page);
  await finishIntro(page);
  await expectEndState(page, 1280, REPLAY['/es']);
});

test.describe('the scene', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  async function freeze(page: Page, seconds: number) {
    await page.locator(STAGE).evaluate((stage, ms) => {
      for (const animation of stage.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = ms;
      }
    }, seconds * 1000);
  }

  test('lights the invoices path mid-run while the desk waits', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);
    await freeze(page, 5.2);
    const frame = await page.evaluate(() => {
      const tile = (name: string) => {
        const node = document.querySelector(
          `.sb-node[data-tile="${name}"] > .flow-tile`,
        );
        return node ? Number(getComputedStyle(node).opacity).toFixed(2) : null;
      };
      const job = document.querySelector('.sb-job[data-job="invoices"]');
      return {
        caption: job ? Number(getComputedStyle(job).opacity) : 0,
        gmail: tile('gmail'),
        xero: tile('xero'),
        human: tile('human'),
        woocommerce: tile('woocommerce'),
      };
    });
    expect(frame.caption).toBe(1);
    expect(frame).toMatchObject({
      gmail: '1.00',
      xero: '1.00',
      human: '1.00',
      woocommerce: '0.30',
    });
    expect(await deskVisibility(page)).toBe('hidden');
    await expect(page.locator('.sb-job[data-job="invoices"]')).toContainText(
      enHome.hero.stage.jobs.invoices.text,
    );
  });

  test('Skip ends it at once and Replay plays it again', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const button = page.locator(BUTTON);
    await expect(button).toHaveAccessibleName('Skip the animation');
    await button.click();
    expect(await intro(page)).toBe('done');
    expect(await running(page)).toBe(0);
    expect(await deskVisibility(page)).toBe('visible');
    await expect(page.locator('.sb-job, .sb-hop')).toHaveCount(0);
    await expect(button).toHaveAccessibleName('Replay the animation');
    await button.click();
    await expect(page.locator(STAGE)).toHaveAttribute('data-intro', 'play');
    expect(await running(page)).toBeGreaterThan(0);
    expect(await deskVisibility(page)).toBe('hidden');
    await expect(button).toHaveAccessibleName('Skip the animation');
    await button.press('Enter');
    expect(await intro(page)).toBe('done');
    expect(await deskVisibility(page)).toBe('visible');
  });

  test('a key into the hero ends it', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const cta = page.locator('.hero-actions a');
    await page
      .locator('header')
      .getByRole('link', { name: 'Book a call' })
      .focus();
    await page.keyboard.press('Tab');
    await expect(cta).toBeFocused();
    expect(await intro(page)).toBe('done');
  });

  test('a press on the stage ends it and lands nowhere', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const chip = page.locator('[data-desk] .desk-chip').first();
    const box = await chip.boundingBox();
    if (!box) throw new Error('no chip box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await intro(page)).toBe('done');
    await expect(page).toHaveURL('/');
    await expect(page.locator('dialog[data-chat-panel]')).toHaveCount(0);
  });

  test('a chip right after it ends grows the chat out of the desk box', async ({
    page,
  }) => {
    test.skip(!ASSISTANT_PUBLISHED, 'the assistant is not published');
    await page.addInitScript(() => {
      const animate = Element.prototype.animate;
      Element.prototype.animate = function recorded(frames, options) {
        if (this.matches('dialog[data-chat-panel]') && Array.isArray(frames)) {
          const first = frames[0]?.transform;
          if (typeof first === 'string') {
            document.documentElement.dataset.firstFrame = first;
          }
        }
        return animate.call(this, frames, options);
      };
    });
    await page.goto('/');
    await waitForHydration(page);
    await page.locator(STAGE).dispatchEvent('pointerdown');
    expect(await intro(page)).toBe('done');
    const desk = await page.locator('[data-desk]').boundingBox();
    await page.locator('[data-desk] .desk-chip').first().click();
    const dialog = page.locator('dialog[data-chat-panel]');
    await expect(dialog).toBeVisible();
    await expect(page.locator('html[data-first-frame]')).toHaveCount(1);
    await settleAnimations(page);
    const panel = await dialog.boundingBox();
    const first = await page.locator('html').getAttribute('data-first-frame');
    const match =
      /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+), ([\d.]+)\)/.exec(
        first ?? '',
      );
    if (!desk || !panel || !match) throw new Error(`no frame: ${first}`);
    const [, x, y, scaleX, scaleY] = match.map(Number);
    expect(Math.abs((x ?? 0) - (desk.x - panel.x))).toBeLessThanOrEqual(2);
    expect(Math.abs((y ?? 0) - (desk.y - panel.y))).toBeLessThanOrEqual(2);
    expect(
      Math.abs((scaleX ?? 0) * panel.width - desk.width),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs((scaleY ?? 0) * panel.height - desk.height),
    ).toBeLessThanOrEqual(2);
  });

  // A real press: the button's own press transition must not read as the scene
  async function slowPress(page: Page) {
    const box = await page.locator(BUTTON).boundingBox();
    if (!box) throw new Error('no button box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.mouse.up();
  }

  test('a slow press mid-scene skips it', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await slowPress(page);
    expect(await intro(page)).toBe('done');
    expect(await running(page)).toBe(0);
  });

  test('a slow press after the scene replays it', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await finishIntro(page);
    await slowPress(page);
    await expect(page.locator(STAGE)).toHaveAttribute('data-intro', 'play');
    expect(await running(page)).toBeGreaterThan(0);
    expect(await deskVisibility(page)).toBe('hidden');
  });

  // The site's links load pages; the chat and voice open them in-app, through
  // the router's history, which this stands in for.
  test('an in-app return to home does not replay it', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    await page.evaluate(() => {
      history.pushState({}, '', '/pricing');
      dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });
    await expect(page.locator(STAGE)).toHaveCount(0);
    await page.evaluate(() => history.back());
    await expect(page.locator(STAGE)).toHaveAttribute('data-intro', 'done');
    expect(await running(page)).toBe(0);
    expect(await deskVisibility(page)).toBe('visible');
  });
});

test.describe('on a touch phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('a swipe over the hero scrolls and lets the scene play on', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHydration(page);
    const cdp = await page.context().newCDPSession(page);
    const point = (y: number) => [{ x: 195, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: point(600),
    });
    for (let step = 1; step <= 12; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: point(600 - step * 25),
      });
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    expect(await intro(page)).toBe('play');
    expect(await running(page)).toBeGreaterThan(0);
  });

  test('a tap ends it and lands nowhere', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    const chip = await page
      .locator('[data-desk] .desk-chip')
      .first()
      .boundingBox();
    if (!chip) throw new Error('no chip box');
    await page.touchscreen.tap(
      chip.x + chip.width / 2,
      chip.y + chip.height / 2,
    );
    await expect(page.locator(STAGE)).toHaveAttribute('data-intro', 'done');
    await expect(page).toHaveURL('/');
    await expect(page.locator('dialog[data-chat-panel]')).toHaveCount(0);
  });
});

test.describe('under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows the final frame at once, with no button', async ({ page }) => {
    await page.goto('/');
    await waitForHydration(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('[data-desk]')).toBeVisible();
    await expect(page.locator(BUTTON)).toBeHidden();
  });
});
