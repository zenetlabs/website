import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRIMARY_BUTTON } from '@/components/ui';

const CSS = readFileSync(
  join(process.cwd(), 'src', 'styles', 'app.css'),
  'utf8',
);

function blockAfter(marker: string): string {
  const start = CSS.indexOf(marker);
  if (start < 0) throw new Error(`${marker} is missing from app.css`);
  const open = CSS.indexOf('{', start);
  let depth = 1;
  let end = open + 1;
  while (depth > 0 && end < CSS.length) {
    if (CSS[end] === '{') depth += 1;
    if (CSS[end] === '}') depth -= 1;
    end += 1;
  }
  return CSS.slice(open + 1, end - 1);
}

describe('motion policy', () => {
  it('never scrolls smoothly', () => {
    expect(CSS).not.toMatch(/scroll-behavior:\s*smooth/);
  });

  it('animates nothing on load: the one keyframe set is the menu opening', () => {
    expect(
      [...CSS.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]),
    ).toEqual(['menu-in']);
    const gated = blockAfter(
      '@media (prefers-reduced-motion: no-preference) {\n  details[open] > .menu-panel',
    );
    expect(gated).toMatch(
      /details\[open\] > \.menu-panel\s*\{[^}]*animation:\s*menu-in/,
    );
    expect(CSS.replace(gated, '')).not.toMatch(/animation:\s*menu-in/);
    expect(blockAfter('@keyframes menu-in')).not.toMatch(/\bto\s*\{|100%/);
  });

  it('removes keyframes but adds no blanket transition under reduced motion', () => {
    const reduced = blockAfter('@media (prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).not.toMatch(/transition/);
    expect(reduced).not.toMatch(/transform/);
  });

  it('keeps button colour changes under reduced motion and gates the press scale', () => {
    expect(PRIMARY_BUTTON).toMatch(
      /(?<!motion-safe:)transition-\[background-color,border-color,color\]/,
    );
    expect(PRIMARY_BUTTON).toContain('motion-safe:active:scale-[0.97]');
    expect(PRIMARY_BUTTON).toContain(
      'motion-safe:transition-[background-color,border-color,color,scale]',
    );
    expect(PRIMARY_BUTTON).not.toMatch(/(?<!motion-safe:)active:scale/);
  });

  it('uses the Emil ease-out curve and never an ease-in', () => {
    expect(CSS).toContain('--ease-out: cubic-bezier(0.23, 1, 0.32, 1)');
    expect(CSS).not.toMatch(/ease-in(?!-out)/);
  });

  it('keeps press and hover feedback under 300ms', () => {
    for (const [, value] of CSS.matchAll(/--duration-[\w-]+:\s*(\d+)ms/g)) {
      expect(Number(value)).toBeLessThan(300);
    }
  });

  it('gates hover effects behind a fine pointer', () => {
    expect(PRIMARY_BUTTON).not.toMatch(/(?<!pointer-fine:)hover:/);
  });
});
