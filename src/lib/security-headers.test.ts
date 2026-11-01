import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('Permissions-Policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function policy(voice: boolean): Promise<string | undefined> {
    vi.stubGlobal('__VOICE__', voice);
    vi.resetModules();
    const { HEADERS: built } = await import('@/lib/security-headers');
    return new Map(built).get('Permissions-Policy');
  }

  it('keeps the microphone off while voice is dark', async () => {
    expect(await policy(false)).toBe(
      'camera=(), microphone=(), geolocation=()',
    );
  });

  it('lets only this origin use the microphone once voice is built in, and nobody the camera or location', async () => {
    expect(await policy(true)).toBe(
      'camera=(), microphone=(self), geolocation=()',
    );
  });
});
