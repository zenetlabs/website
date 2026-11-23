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
});
