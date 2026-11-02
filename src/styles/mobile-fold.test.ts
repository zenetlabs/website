import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(process.cwd(), 'src/styles/app.css'), 'utf8');

function block(source: string, start: number): string {
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] === '}' && --depth === 0) {
      return source.slice(open, index);
    }
  }
  throw new Error('unbalanced braces');
}

describe('mobile fold', () => {
  it('hides the summary only where ::details-content can reveal the content', () => {
    const supports = CSS.indexOf('@supports selector(::details-content)');
    expect(supports).toBeGreaterThan(-1);
    const inside = block(CSS, supports);
    expect(inside).toContain('@media (min-width: 768px)');
    expect(inside).toContain('.mobile-fold::details-content');
    expect(inside).toMatch(/\.mobile-fold > summary\s*\{\s*display: none/);
    const outside = CSS.replace(inside, '');
    expect(outside).not.toMatch(/\.mobile-fold > summary/);
  });

  it('keeps the summary class free of an unconditional md:hidden', () => {
    const rule = CSS.indexOf('.mobile-fold-summary {');
    expect(block(CSS, rule)).not.toContain('md:hidden');
  });
});
