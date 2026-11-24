import { describe, expect, it } from 'vitest';
import {
  type CapturedPage,
  type MarkdownToken,
  pageToMarkdown,
} from '@/lib/markdown';
import { PART_MAX, parsePage, sectionParts } from '@/server/page-outline';

const open = (tag: string, href: string | null = null): MarkdownToken => ({
  kind: 'open',
  tag,
  href,
  hidden: false,
});
const close: MarkdownToken = { kind: 'close' };
const text = (value: string): MarkdownToken => ({ kind: 'text', text: value });

function block(tag: string, value: string): MarkdownToken[] {
  return [open(tag), text(value), close];
}

function page(tokens: MarkdownToken[], jsonLd: string[] = []): string {
  const captured: CapturedPage = {
    title: 'Pricing | Zenet Labs',
    description: 'Prices "in" SGD.',
    canonical: 'https://zenetlabs.com/pricing',
    url: 'https://zenetlabs.com/pricing',
    jsonLd,
    tokens,
  };
  return pageToMarkdown(captured);
}

const SAMPLE = page(
  [
    open('main'),
    ...block('h1', 'Clear prices'),
    open('p'),
    text('Intro with a '),
    open('a', '/pricing/calculator'),
    text('calculator'),
    close,
    text(' and a *star*.'),
    close,
    ...block('h2', 'Automation diagnostic'),
    ...block('p', 'S$3,000 for one to two weeks.'),
    ...block('p', 'Credited to the project.'),
    open('h2'),
    open('a', '/services/maintenance'),
    text('Maintenance'),
    close,
    close,
    ...block('p', 'Monthly.'),
    ...block('h3', 'What is   included?'),
    ...block('p', 'Monitoring.'),
    close,
  ],
  ['{"@type":"WebPage"}'],
);

describe('parsePage', () => {
  it('reads the frontmatter and lists every heading with its hashes', () => {
    expect(parsePage(SAMPLE)).toMatchObject({
      title: 'Pricing | Zenet Labs',
      description: 'Prices "in" SGD.',
      sections: [
        '# Clear prices',
        '## Automation diagnostic',
        '## Maintenance',
        '### What is included?',
      ],
    });
  });

  it('ignores the JSON-LD fences after the body', () => {
    const withFence = page(
      [open('main'), ...block('h1', 'A'), close],
      ['{"x":"# not a heading"}'],
    );
    expect(parsePage(withFence).sections).toEqual(['# A']);
  });

  it('reads a literal document and survives a missing frontmatter', () => {
    expect(
      parsePage('---\ntitle: "T"\n---\n\n## One\n\ntext\n\n## Two\n').sections,
    ).toEqual(['## One', '## Two']);
    expect(parsePage('# Bare\n').title).toBe('');
  });
});

describe('sectionParts', () => {
  it('returns the text under a heading up to the next heading, links reduced', () => {
    const found = sectionParts(parsePage(SAMPLE), 'Automation diagnostic');
    expect(found).toEqual({
      heading: '## Automation diagnostic',
      parts: ['S$3,000 for one to two weeks.\n\nCredited to the project.'],
      next: '## Maintenance',
    });
  });

  it('matches a linked heading by its label, and ignores case, hashes and spacing', () => {
    expect(sectionParts(parsePage(SAMPLE), '## MAINTENANCE')?.heading).toBe(
      '## Maintenance',
    );
    expect(
      sectionParts(parsePage(SAMPLE), '  what is   included? ')?.parts,
    ).toEqual(['Monitoring.']);
  });

  it('reduces links to their text and unescapes the converter escapes', () => {
    const intro = sectionParts(parsePage(SAMPLE), 'Clear prices');
    expect(intro?.parts).toEqual(['Intro with a calculator and a *star*.']);
    expect(intro?.parts.join('')).not.toContain('http');
  });

  it('has no next after the last heading', () => {
    expect(
      sectionParts(parsePage(SAMPLE), 'What is included?')?.next,
    ).toBeNull();
  });

  it('answers null for an unknown label', () => {
    expect(sectionParts(parsePage(SAMPLE), 'Nope')).toBeNull();
  });

  it('cuts a long section into parts of at most the limit, at paragraph boundaries', () => {
    const paragraph = 'word '.repeat(80).trim();
    const long = page([
      open('main'),
      ...block('h2', 'Long'),
      ...Array.from({ length: 12 }, () => block('p', paragraph)).flat(),
      close,
    ]);
    const found = sectionParts(parsePage(long), 'Long');
    expect(found?.parts.length).toBeGreaterThan(1);
    for (const part of found?.parts ?? []) {
      expect(part.length).toBeLessThanOrEqual(PART_MAX);
    }
    expect(found?.parts.join('\n\n')).toBe(
      Array.from({ length: 12 }, () => paragraph).join('\n\n'),
    );
  });

  it('cuts a paragraph longer than the limit at a word boundary', () => {
    const huge = page([
      open('main'),
      ...block('h2', 'Huge'),
      ...block('p', 'abc '.repeat(1000).trim()),
      close,
    ]);
    const found = sectionParts(parsePage(huge), 'Huge');
    expect(found?.parts.length).toBeGreaterThan(2);
    for (const part of found?.parts ?? []) {
      expect(part.length).toBeLessThanOrEqual(PART_MAX);
      expect(part.startsWith('abc')).toBe(true);
      expect(part.endsWith('abc')).toBe(true);
    }
  });

  it('gives one empty part for a heading with nothing under it', () => {
    const bare = page([
      open('main'),
      ...block('h2', 'Empty'),
      ...block('h3', 'Child'),
      ...block('p', 'x'),
      close,
    ]);
    expect(sectionParts(parsePage(bare), 'Empty')?.parts).toEqual(['']);
  });
});

describe('repeated headings', () => {
  const repeated = page([
    open('main'),
    ...block('h2', 'Questions'),
    ...block('p', 'First list.'),
    ...block('h2', 'Questions'),
    ...block('p', 'Second list.'),
    ...block('h3', 'questions'),
    ...block('p', 'Third list.'),
    close,
  ]);

  it('gives each repeat its own label, from the second on', () => {
    expect(parsePage(repeated).sections).toEqual([
      '## Questions',
      '## Questions (2)',
      '### questions (3)',
    ]);
  });

  it('reads the section each label names', () => {
    const parsed = parsePage(repeated);
    expect(sectionParts(parsed, 'Questions')?.parts).toEqual(['First list.']);
    expect(sectionParts(parsed, '## Questions (2)')?.parts).toEqual([
      'Second list.',
    ]);
    expect(sectionParts(parsed, 'questions (3)')?.parts).toEqual([
      'Third list.',
    ]);
  });
});
