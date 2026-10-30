// Renders public/og-<locale>.png (1200x630). Run: node scripts/og-images.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = new URL('../', import.meta.url);
const read = (path, encoding) => readFileSync(new URL(path, root), encoding);
const font = (style) =>
  `data:font/woff2;base64,${read(`node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-${style}.woff2`).toString('base64')}`;

const tokens = read('src/styles/tokens.css', 'utf8');
const logo = read('public/logo/logo.svg', 'utf8');

const html = (tagline) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
${tokens}
@font-face { font-family: "Instrument Serif"; font-style: normal; src: url("${font('normal')}") format("woff2"); }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("${font('italic')}") format("woff2"); }
* { margin: 0; box-sizing: border-box; }
body {
  width: 1200px;
  height: 630px;
  padding: 112px 96px 0;
  background-color: var(--bg);
  background-image: radial-gradient(var(--hairline) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--fg);
  font-family: "Instrument Serif", serif;
}
.logo { width: 112px; height: 130px; }
.logo svg { width: 100%; height: 100%; }
h1 { margin-top: 28px; font-size: 150px; font-weight: 400; line-height: 1; }
p { margin-top: 24px; color: var(--brand-amber); font-size: 56px; font-style: italic; line-height: 1.2; }
.rule { width: 120px; height: 3px; margin-top: 52px; background: var(--brand-teal); }
</style>
</head>
<body>
<div class="logo">${logo}</div>
<h1>Zenet Labs</h1>
<p>${tagline}</p>
<div class="rule"></div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.emulateMedia({ colorScheme: 'dark' });
for (const locale of ['en', 'es']) {
  const { og } = JSON.parse(read(`src/i18n/${locale}.json`, 'utf8'));
  await page.setContent(html(og.tagline));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: fileURLToPath(new URL(`public/og-${locale}.png`, root)),
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });
}
await browser.close();
