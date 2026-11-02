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

  it('plays the proof panel entrance only without a reduced-motion request', () => {
    const entrance = blockAfter(
      '@media (prefers-reduced-motion: no-preference)',
    );
    expect(entrance).toMatch(/\.proof-in\s*\{[^}]*animation:\s*proof-in/);
    expect(CSS.replace(entrance, '')).not.toMatch(/animation:\s*proof-in/);
  });

  it('starts the entrance from the final state, so removing it shows the result', () => {
    const keyframes = blockAfter('@keyframes proof-in');
    expect(keyframes).toMatch(/from\s*\{/);
    expect(keyframes).not.toMatch(/\bto\s*\{|100%/);
  });

  it('removes keyframes but adds no blanket transition under reduced motion', () => {
    const reduced = blockAfter('@media (prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/animation:\s*none/);
    expect(reduced).not.toMatch(/transition/);
    expect(reduced).not.toMatch(/transform/);
  });

  it('keeps button colour changes under reduced motion and gates the press scale', () => {
    expect(PRIMARY_BUTTON).toMatch(
      /(?<!motion-safe:)transition-\[background-color,border-color\]/,
    );
    expect(PRIMARY_BUTTON).toContain('motion-safe:active:scale-[0.97]');
    expect(PRIMARY_BUTTON).toContain(
      'motion-safe:transition-[background-color,border-color,scale]',
    );
    expect(PRIMARY_BUTTON).not.toMatch(/(?<!motion-safe:)active:scale/);
  });

  it('uses the Emil ease-out curve and never an ease-in', () => {
    expect(CSS).toContain('--ease-out: cubic-bezier(0.23, 1, 0.32, 1)');
    expect(CSS).not.toMatch(/ease-in(?!-out)/);
  });
});
