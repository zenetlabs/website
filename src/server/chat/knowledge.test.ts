import { describe, expect, it } from 'vitest';
import { loadHomeContent, loadPricingContent } from '@/content/load';
import { locales } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { pagesIn, type SiteFlags } from '@/lib/page-registry';
import { buildKnowledge } from '@/server/chat/knowledge';

const LIVE: SiteFlags = {
  calculator: { published: true },
  booking: { published: true },
};
const DARK: SiteFlags = {
  calculator: { published: false },
  booking: { published: false },
};
const LADDER = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
] as const;

describe.each(locales)('buildKnowledge(%s)', (locale) => {
  it('carries every official price summary and every home FAQ question', async () => {
    const text = await buildKnowledge(locale, LIVE);
    const { services } = await loadPricingContent(locale);
    for (const id of LADDER) {
      expect(text).toContain(formatPriceSummary(locale, services[id].prices));
    }
    const { faq } = await loadHomeContent(locale);
    for (const item of faq) expect(text).toContain(item.question);
  });

  it('lists every published page id as a navigate target', async () => {
    for (const site of [LIVE, DARK]) {
      const text = await buildKnowledge(locale, site);
      const section = text.slice(text.indexOf('NAVIGATE'));
      for (const id of pagesIn(locale, site)) {
        expect(section).toContain(`- ${id}:`);
      }
    }
  });

  it('leaves out pages whose flag is off', async () => {
    const text = await buildKnowledge(locale, DARK);
    expect(text).not.toContain('- book:');
    expect(text).not.toContain('- calculator:');
    expect(await buildKnowledge(locale, LIVE)).toContain('- book:');
  });

  it('holds no placeholder, null, link or Markdown link', async () => {
    const text = await buildKnowledge(locale, LIVE);
    expect(text).not.toMatch(/TODO|\[X\]|\bnull\b|undefined|https?:|\]\(/);
  });

  it('stays within the size budget', async () => {
    expect((await buildKnowledge(locale, LIVE)).length).toBeLessThanOrEqual(
      24_000,
    );
  });

  it('quotes only its own market currency', async () => {
    const text = await buildKnowledge(locale, LIVE);
    if (locale === 'es') {
      expect(text).not.toContain('S$ ');
      expect(text).toContain('euros');
    } else {
      expect(text).not.toContain('€');
    }
  });
});

describe('buildKnowledge differences', () => {
  it('has the Verifactu dates and the Holded pages in Spanish only', async () => {
    const es = await buildKnowledge('es', LIVE);
    const en = await buildKnowledge('en', LIVE);
    expect(es).toContain('VERIFACTU');
    expect(es).toContain('1 de enero de 2027');
    expect(es).toContain('holdedPrestashop');
    expect(en).not.toContain('VERIFACTU');
  });

  it('keeps both locales to the same sections apart from the Spanish-only one', async () => {
    const headings = (text: string) =>
      text.split('\n').filter((line) => /^[A-ZÁÉÍÓÚÑ ]{3,}$/.test(line));
    const en = headings(await buildKnowledge('en', LIVE));
    const es = headings(await buildKnowledge('es', LIVE)).filter(
      (h) => h !== 'VERIFACTU',
    );
    expect(es).toHaveLength(en.length);
  });

  it('does not offer a call while booking is dark', async () => {
    expect(await buildKnowledge('en', DARK)).not.toContain('30-minute call');
    expect(await buildKnowledge('en', LIVE)).toContain('30-minute call');
  });
});
