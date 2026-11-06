import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { gotoHydrated, PAGE_TYPE_URLS, settleAnimations } from './helpers';

const LABEL = process.env.VISUAL_LABEL ?? 'after';
const OUT = join('visual-shots', LABEL);
const STYLE = join('e2e', 'visual.css');
const STYLE_TEXT = readFileSync(STYLE, 'utf8');

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

function slugOf(url: string): string {
  const [path = ''] = url.split('?');
  return path === '/' ? 'home' : path.replace(/^\//, '').replaceAll('/', '_');
}

const heights: Record<string, Record<string, number>> = {};

for (const viewport of WIDTHS) {
  const variant = `light-${viewport.width}`;

  test.describe(variant, () => {
    test.use({ viewport });

    test.afterAll(() => {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(
        join(OUT, 'heights.json'),
        `${JSON.stringify(heights, null, 2)}\n`,
      );
    });

    for (const url of PAGE_TYPE_URLS) {
      test(`${url}`, async ({ page }) => {
        await gotoHydrated(page, url);
        await page.evaluate(() => document.fonts.ready);
        await settleAnimations(page);
        const slug = slugOf(url);
        heights[variant] = {
          ...heights[variant],
          [slug]: await page.evaluate(
            () => document.documentElement.scrollHeight,
          ),
        };
        await page.screenshot({
          path: join(OUT, variant, `${slug}.png`),
          fullPage: true,
          animations: 'disabled',
          style: STYLE_TEXT,
        });
      });
    }
  });
}
