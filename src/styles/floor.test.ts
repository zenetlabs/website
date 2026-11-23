import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const CSS = readFileSync(join(ROOT, 'src/styles/app.css'), 'utf8');

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.test.tsx'))
    .map((file) => join(dir, file));
}

// Rules whose selector list names exactly html, body or :root and hide overflow sideways.
function offenders(css: string): string[] {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .flatMap((chunk) => {
      const open = chunk.lastIndexOf('{');
      const head = chunk.slice(0, open);
      const selectors = head.slice(
        Math.max(head.lastIndexOf('{'), head.lastIndexOf(';')) + 1,
      );
      const hides = chunk
        .slice(open + 1)
        .split(';')
        .map((line) => line.replace(/\s*!important/, '').trim())
        .filter(
          (line) =>
            /^overflow(-x)?:\s*hidden\b/.test(line) ||
            /^@apply\b.*(^|[\s:!])overflow(-x)?-hidden\b/.test(line),
        );
      return open >= 0 &&
        selectors
          .split(',')
          .some((part) =>
            /^(html|body|:root)(?![\w-])[^\s>+~]*$/.test(part.trim()),
          )
        ? hides
        : [];
    });
}

function rule(selector: string): string {
  const start = CSS.indexOf(`\n  ${selector} {`);
  expect(start).toBeGreaterThan(-1);
  return CSS.slice(start, CSS.indexOf('\n  }', start));
}

describe('the floor', () => {
  it('draws no glyph arrow on link text', () => {
    const hits = [
      ...sources('src/components'),
      ...sources('src/routes'),
    ].filter((file) => readFileSync(join(ROOT, file), 'utf8').includes('→'));
    expect(hits).toEqual([]);
  });

  it('ends no label string in a glued arrow', () => {
    const files = [
      ...readdirSync(join(ROOT, 'src/content'), {
        recursive: true,
        encoding: 'utf8',
      })
        .filter((file) => file.endsWith('.ts'))
        .map((file) => join('src/content', file)),
      ...readdirSync(join(ROOT, 'src/i18n'), { encoding: 'utf8' })
        .filter((file) => file.endsWith('.json'))
        .map((file) => join('src/i18n', file)),
    ];
    const hits = files.filter((file) =>
      /\S ?→["'`]/.test(readFileSync(join(ROOT, file), 'utf8')),
    );
    expect(hits).toEqual([]);
  });

  it('clips the page sideways on html and body', () => {
    expect(rule('html')).toContain('overflow-x: clip');
    expect(rule('body')).toContain('overflow-x: clip');
  });

  it('hides the page sideways on no rule of html or body', () => {
    const files = readdirSync(join(ROOT, 'src/styles')).filter((file) =>
      file.endsWith('.css'),
    );
    const hits = files.flatMap((file) =>
      offenders(readFileSync(join(ROOT, 'src/styles', file), 'utf8')).map(
        (hit) => `${file}: ${hit}`,
      ),
    );
    expect(hits).toEqual([]);
  });

  it('catches a bad rule and ignores the menu lock', () => {
    for (const css of [
      '@layer base { @media (min-width: 1px) { html, .x { overflow: hidden } } }',
      'body { overflow-x: hidden !important }',
      'html { @apply md:overflow-x-hidden; }',
      'html:has(x) { overflow: hidden }',
      'body.lock { overflow-x: hidden }',
    ]) {
      expect(offenders(css)).toHaveLength(1);
    }
    for (const css of [
      '@media (max-width: 767px) { html:has(header details[open]) { overflow-y: hidden } }',
      'html { overflow-y: hidden; overflow: clip } body > footer { overflow: hidden }',
    ]) {
      expect(offenders(css)).toEqual([]);
    }
  });

  it('puts no overflow utility on the root document tags', () => {
    const root = readFileSync(join(ROOT, 'src/routes/__root.tsx'), 'utf8');
    const tags = [/<html\b[^>]*>/, /<body\b[^>]*>/].map(
      (pattern) => pattern.exec(root)?.[0] ?? '',
    );
    expect(tags.every(Boolean)).toBe(true);
    for (const tag of tags) expect(tag).not.toMatch(/overflow-(?:x-)?hidden/);
  });
});
