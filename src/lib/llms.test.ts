import { describe, expect, it } from 'vitest';
import { LLMS_TXT } from '@/lib/llms';
import { PAGE_IDS, pagePath } from '@/lib/page-registry';
import { PORTFOLIO } from '@/lib/portfolio';

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
    expect(urls).toHaveLength(6);
    expect(urls.every((url) => url.startsWith('https://zenetlabs.com'))).toBe(
      true,
    );
    expect(urls.map((url) => new URL(url).pathname)).toEqual([
      ...PAGE_IDS.map((page) => pagePath('en', page)),
      ...PAGE_IDS.map((page) => pagePath('es', page)),
    ]);
  });

  it('lists the portfolio and the contact address', () => {
    expect(hrefs(section('## Portfolio'))).toEqual(
      PORTFOLIO.map((p) => p.href),
    );
    expect(LLMS_TXT).toContain('mailto:hello@zenetlabs.com');
  });
});
