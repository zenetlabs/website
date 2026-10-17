import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HEADERS } from '@/lib/security-headers';

function starBlock(file: string): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  let inBlock = false;
  for (const line of file.split('\n')) {
    if (!line.startsWith(' ') && line.trim() !== '') {
      inBlock = line.trim() === '/*';
      continue;
    }
    if (!inBlock || line.trim() === '') continue;
    const separator = line.indexOf(':');
    lines.push([
      line.slice(0, separator).trim(),
      line.slice(separator + 1).trim(),
    ]);
  }
  return lines;
}

describe('public/_headers', () => {
  it('matches the security headers set by the worker', () => {
    const file = readFileSync('public/_headers', 'utf8');
    expect(new Map(starBlock(file))).toEqual(new Map(HEADERS));
  });
});
