import { describe, expect, it } from 'vitest';
import { legalEntity } from '@/lib/content';
import { buildLlmsTxt, LLMS_TXT } from '@/lib/llms';
import { pagePath, pagesIn } from '@/lib/page-registry';
import { PORTFOLIO } from '@/lib/portfolio';
import { FLIPPED } from '../../test/entities';

const LINK = /^- \[[^\]]+\]\((https?:\/\/|mailto:)[^)]+\)(: .+)?$/;

const lines = LLMS_TXT.split('\n');

function section(heading: string): string[] {
  const start = lines.indexOf(heading);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).filter(Boolean);
}

function hrefs(items: string[]): string[] {
  return items.flatMap((line) => /\]\(([^)]+)\)/.exec(line)?.[1] ?? []);
}

describe('LLMS_TXT', () => {
  it('opens with the title and a summary quote', () => {
    expect(lines[0]).toBe('# Zenet Labs');
    expect(lines[2]?.startsWith('> ')).toBe(true);
    expect(LLMS_TXT.endsWith('\n')).toBe(true);
  });

  it('orders the sections', () => {
    const headings = lines.filter((line) => line.startsWith('## '));
    expect(headings).toEqual(['## Pages', '## Portfolio', '## Contact']);
  });

  it('writes every list line as a link', () => {
    const items = lines
      .slice(lines.indexOf('## Pages'))
      .filter((line) => line.startsWith('- '));
    expect(items.filter((line) => !LINK.test(line))).toEqual([]);
  });

  it('lists every page in both locales on the production host', () => {
    const urls = hrefs(section('## Pages'));
    expect(urls).toHaveLength(7);
    expect(urls.every((url) => url.startsWith('https://zenetlabs.com'))).toBe(
      true,
    );
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      ...pagesIn('en').map((page) => pagePath('en', page)),
      ...pagesIn('es').map((page) => pagePath('es', page)),
    ]);
  });

  it('names the operator of both sites once while they share an entity', () => {
    const operator = legalEntity('en');
    expect(LLMS_TXT).toContain(
      `The English and Spanish sites are operated by ${operator.legalName} (UEN ${operator.taxId.value}), 160 Robinson Road #14-04, Singapore 068914.`,
    );
  });

  it('names each locale own operator once the Spanish entity is flipped', () => {
    const flipped = buildLlmsTxt((locale) =>
      locale === 'es' ? FLIPPED : legalEntity('en'),
    );
    expect(flipped).toContain(
      'The English site is operated by Zenet Technology Pte. Ltd. (UEN 202202371M), 160 Robinson Road #14-04, Singapore 068914.',
    );
    expect(flipped).toContain(
      'The Spanish site is operated by Albert Sabaté Martínez (NIF 47986151D), Calle Ejemplo 1, 08001 Barcelona.',
    );
  });

  it('lists the portfolio and the contact address', () => {
    expect(hrefs(section('## Portfolio'))).toEqual(
      PORTFOLIO.map((p) => p.href),
    );
    expect(LLMS_TXT).toContain('mailto:hello@zenetlabs.com');
  });
});
