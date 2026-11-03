import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bandPropertyNames,
  pagePropertyNames,
  type Scope,
  scopes,
} from '../../test/css-scopes';

function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function ratio(foreground: string, background: string): number {
  const [light = 0, dark = 0] = [
    luminance(foreground),
    luminance(background),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

const TOKENS_CSS = readFileSync(
  join(process.cwd(), 'src', 'styles', 'tokens.css'),
  'utf8',
);
const SCOPES = scopes(TOKENS_CSS);

const TEXT = 4.5;
const GRAPHIC = 3;
const PAGE: readonly Scope[] = ['light', 'dark'];
const BAND: readonly Scope[] = ['bandLight', 'bandDark'];

const PAIRS: ReadonlyArray<
  readonly [string, string, number, readonly Scope[]]
> = [
  ['fg', 'bg', TEXT, PAGE],
  ['fg-soft', 'bg', TEXT, PAGE],
  ['fg', 'surface', TEXT, PAGE],
  ['fg-soft', 'surface', TEXT, PAGE],
  ['fg-soft', 'bg-tint', TEXT, PAGE],
  ['muted-fg', 'bg', TEXT, PAGE],
  ['muted-fg', 'bg-tint', TEXT, PAGE],
  ['muted-fg', 'surface', TEXT, PAGE],
  ['accent-fg', 'accent', TEXT, PAGE],
  ['on-highlight', 'highlight', TEXT, PAGE],
  ['link', 'bg', TEXT, PAGE],
  ['link', 'bg-tint', TEXT, PAGE],
  ['link', 'surface', TEXT, PAGE],
  ['link', 'highlight-soft', TEXT, ['light']],
  ['agent', 'bg', TEXT, PAGE],
  ['agent', 'bg-tint', TEXT, PAGE],
  ['agent', 'agent-soft', TEXT, PAGE],
  ['tool', 'bg-tint', TEXT, ['light']],
  ['tool', 'surface', TEXT, ['light']],
  ['tool', 'tool-soft', TEXT, PAGE],
  ['tool', 'bg', TEXT, ['dark']],
  ['human', 'human-soft', GRAPHIC, PAGE],
  ['fg', 'human-soft', TEXT, PAGE],
  ['fg', 'highlight-soft', TEXT, PAGE],
  ['muted-fg', 'highlight-soft', TEXT, PAGE],
  ['fg-soft', 'human-soft', TEXT, PAGE],
  ['fg-soft', 'tool-soft', TEXT, PAGE],
  ['fg-soft', 'agent-soft', TEXT, PAGE],
  ['cta-fg', 'cta', TEXT, PAGE],
  ['cta-fg', 'cta-hover', TEXT, PAGE],
  ['fg', 'bg', TEXT, BAND],
  ['fg-soft', 'bg', TEXT, BAND],
  ['muted-fg', 'bg', TEXT, BAND],
  ['fg', 'surface', TEXT, BAND],
  ['fg-soft', 'surface', TEXT, BAND],
  ['muted-fg', 'surface', TEXT, BAND],
  ['link', 'bg', TEXT, BAND],
  ['agent', 'bg', TEXT, BAND],
  ['tool', 'bg', TEXT, BAND],
  ['cta-fg', 'cta', TEXT, BAND],
  ['accent-fg', 'accent', TEXT, BAND],
  ['border', 'bg', GRAPHIC, [...PAGE, ...BAND]],
  ['focus', 'bg', GRAPHIC, [...PAGE, ...BAND]],
];

function tokenValue(scope: Scope, token: string): string {
  const value = SCOPES[scope][token];
  if (!value) throw new Error(`--${token} is not defined in ${scope}`);
  return value;
}

describe('token contrast', () => {
  for (const [foreground, background, minimum, scopeList] of PAIRS) {
    for (const scope of scopeList) {
      it(`${foreground} on ${background} (${scope}) is at least ${minimum}:1`, () => {
        expect(
          ratio(tokenValue(scope, foreground), tokenValue(scope, background)),
        ).toBeGreaterThanOrEqual(minimum);
      });
    }
  }

  it('measures a known pair and flags a failing one', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#777777', '#888888')).toBeLessThan(TEXT);
  });

  it('keeps the page grounds apart from the band', () => {
    expect(SCOPES.light.bg).not.toBe(SCOPES.bandLight.bg);
    expect(SCOPES.dark.bg).not.toBe(SCOPES.bandDark.bg);
  });

  it('restores in .scope-page every property .band overrides', () => {
    const restored = pagePropertyNames(TOKENS_CSS);
    const missing = [...bandPropertyNames(TOKENS_CSS)].filter(
      (name) => !restored.has(name),
    );
    expect(missing).toEqual([]);
  });
});
