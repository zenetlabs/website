import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/theme-colors';

const SRC = join(process.cwd(), 'src');
const TOKENS = join(SRC, 'styles', 'tokens.css');
const ALLOWED = new Set([TOKENS, join(SRC, 'lib', 'theme-colors.ts')]);

const PALETTE =
  'white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITIES =
  'bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret';

const RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ['hex literal', /#[0-9a-fA-F]{3,8}\b/g],
  ['colour function', /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g],
  [
    'palette utility',
    new RegExp(
      `(?<![\\w:-])(?:${UTILITIES})-(?:${PALETTE})(?:-\\d+)?(?![\\w-])`,
      'g',
    ),
  ],
];

function findViolations(source: string): string[] {
  return RULES.flatMap(([label, pattern]) =>
    [...source.matchAll(pattern)].map((match) => `${label}: ${match[0]}`),
  );
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter(
      (file) =>
        /\.(ts|tsx|css)$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.endsWith('routeTree.gen.ts') &&
        !ALLOWED.has(file),
    );
}

describe('colour guard', () => {
  it('finds no colour literals or palette utilities outside tokens.css', () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      findViolations(readFileSync(file, 'utf8')).map(
        (violation) => `${relative(SRC, file)} ${violation}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('flags a fixture with literals and palette utilities', () => {
    const fixture = [
      'const a = "bg-white text-gray-900 border-red-500/40";',
      'const b = "#fff";',
      'const c = "rgb(0 0 0)";',
      'const d = "oklch(0.5 0.1 200)";',
    ].join('\n');
    expect(findViolations(fixture).length).toBeGreaterThanOrEqual(6);
  });

  it('allows semantic utilities and variant-prefixed palette utilities', () => {
    const clean =
      'const a = "bg-surface text-fg border-border dark:bg-white print:text-black";';
    expect(findViolations(clean)).toEqual([]);
  });

  it('keeps the theme-color pair equal to the --bg tokens', () => {
    const tokens = readFileSync(TOKENS, 'utf8');
    const bg = [...tokens.matchAll(/--bg:\s*(#[0-9a-fA-F]{6})/g)].map(
      (match) => match[1],
    );
    expect(bg).toEqual([THEME_COLOR_LIGHT, THEME_COLOR_DARK]);
  });
});
