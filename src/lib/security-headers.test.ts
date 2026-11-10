import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withSecurityHeaders } from '@/lib/security-headers';

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

// The headers a build sets with voice on or off, whatever production holds.
async function headersFor(voice: boolean): Promise<Map<string, string>> {
  vi.stubGlobal('__VOICE__', voice);
  vi.resetModules();
  const { HEADERS } = await import('@/lib/security-headers');
  return new Map(HEADERS);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('public/_headers', () => {
  // Static assets never need the microphone, so they keep a dark build's set.
  it('matches the security headers a dark worker build sets', async () => {
    const file = readFileSync('public/_headers', 'utf8');
    expect(new Map(starBlock(file))).toEqual(await headersFor(false));
  });
});

describe('Permissions-Policy', () => {
  async function policy(voice: boolean): Promise<string | undefined> {
    return (await headersFor(voice)).get('Permissions-Policy');
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

describe('withSecurityHeaders', () => {
  it('keeps a stricter Referrer-Policy the response set, never a looser one, and overrides the rest', () => {
    const own = withSecurityHeaders(
      new Response('x', {
        headers: {
          'Referrer-Policy': 'no-referrer',
          'X-Frame-Options': 'ALLOW',
        },
      }),
    );
    expect(own.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(own.headers.get('X-Frame-Options')).toBe('DENY');
    expect(
      withSecurityHeaders(new Response('x')).headers.get('Referrer-Policy'),
    ).toBe('strict-origin-when-cross-origin');
  });
});
