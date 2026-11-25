import { expect, type Page, test } from '@playwright/test';
import {
  gotoHydrated,
  HOLDED_PAGES,
  OBSERVER,
  settleAnimations,
} from './helpers';

const BOARD = '[data-flow-board]';

const LCP = `
  window.__boardLcp = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__boardLcp.push(entry.element ? entry.element.tagName : null);
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
`;

declare global {
  interface Window {
    __boardLcp?: Array<string | null>;
  }
}

function ends(page: Page): Promise<number[]> {
  return page
    .locator(BOARD)
    .evaluate((board) =>
      board
        .getAnimations({ subtree: true })
        .map((animation) =>
          Number(animation.effect?.getComputedTiming().endTime),
        ),
    );
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`the agents board plays from load and rests in its final frame at ${viewport.width}`, async ({
    page,
  }) => {
    await page.addInitScript(OBSERVER);
    await page.addInitScript(LCP);
    await page.setViewportSize(viewport);
    await page.goto('/services/ai-agents');
    const timings = await ends(page);
    expect(timings.length).toBeGreaterThan(0);
    for (const end of timings) expect(end).toBeLessThanOrEqual(5000);
    const riding = await page.locator(BOARD).evaluate((board) => {
      const packets = [...board.querySelectorAll('.fb-pk')];
      for (const animation of board.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 1000;
      }
      return Math.max(
        ...packets.map((el) => Number(getComputedStyle(el).opacity)),
      );
    });
    expect(riding).toBeGreaterThan(0);
    await page.locator(BOARD).evaluate((board) => {
      for (const animation of board.getAnimations({ subtree: true })) {
        animation.finish();
      }
    });
    const packets = await page
      .locator('.fb-pk')
      .evaluateAll((all) => all.map((el) => getComputedStyle(el).opacity));
    expect(new Set(packets)).toEqual(new Set(['0']));
    const after = page.locator('.fb-after');
    await expect(after).toHaveCSS('opacity', '1');
    await expect(after).toHaveCSS('translate', 'none');
    expect(await page.evaluate(() => window.__layoutShift)).toBe(0);
    expect(await page.evaluate(() => window.__boardLcp?.at(-1))).toBe('H1');
  });
}

test('a Holded pair board sends four packets, the last one back to the shop, within 5 s', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOLDED_PAGES[1]);
  const direction = await page
    .locator('.fb-pk')
    .evaluateAll((packets) => packets.map((el) => el.getAttribute('data-to')));
  expect(direction).toHaveLength(4);
  expect(direction.at(-1)).toBe('shop');
  for (const end of await ends(page)) expect(end).toBeLessThanOrEqual(5000);
  await expect(page.locator(BOARD)).toHaveAttribute('aria-hidden', 'true');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('plays nothing and shows the approval card', async ({ page }) => {
    await gotoHydrated(page, '/services/ai-agents');
    await settleAnimations(page);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('.fb-after')).toBeVisible();
  });
});
