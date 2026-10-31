// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'migrations');
const FILES = readdirSync(DIR).sort();
const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
  ['DROP', /\bDROP\b/i],
  ['RENAME', /\bRENAME\b/i],
];

function sql(file: string): string {
  return readFileSync(join(DIR, file), 'utf8').replace(/--[^\n]*/g, '');
}

describe('D1 migrations', () => {
  it('has at least the leads migration', () => {
    expect(FILES.length).toBeGreaterThan(0);
  });

  it.each(FILES)('%s is named NNNN_snake_case.sql', (file) => {
    expect(file).toMatch(/^\d{4}_[a-z][a-z_]*\.sql$/);
  });

  it('numbers migrations contiguously from 0001', () => {
    expect(FILES.map((file) => Number.parseInt(file, 10))).toEqual(
      FILES.map((_, index) => index + 1),
    );
  });

  it.each(FILES)('%s is expand-only', (file) => {
    for (const [label, pattern] of FORBIDDEN) {
      expect(sql(file), label).not.toMatch(pattern);
    }
  });

  it('flags a destructive fixture', () => {
    for (const fixture of [
      'DROP TABLE leads;',
      'ALTER TABLE leads RENAME TO x;',
      'ALTER TABLE leads DROP COLUMN name;',
    ]) {
      expect(FORBIDDEN.some(([, pattern]) => pattern.test(fixture))).toBe(true);
    }
  });
});
