import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import { markdownTarget, pagePathForMarkdown } from '@/lib/markdown-response';
import { markdownPath, pagePath, pagesIn } from '@/lib/page-registry';
import { redirectTarget } from '@/lib/redirects';
import { SITE } from '@/lib/site';

const mdCases = locales.flatMap((locale) =>
  pagesIn(locale).map((page) => [locale, page] as const),
);

describe('pagePathForMarkdown', () => {
  it.each(mdCases)(
    '%s %s round-trips to its canonical path',
    (locale, page) => {
      expect(pagePathForMarkdown(markdownPath(locale, page))).toBe(
        pagePath(locale, page),
      );
    },
  );

  it.each(mdCases)('%s %s is never redirected', (locale, page) => {
    const url = new URL(`${SITE.url}${markdownPath(locale, page)}`);
    expect(redirectTarget(url)).toBeNull();
  });

  it('covers 30 pages', () => {
    expect(mdCases).toHaveLength(30);
  });

  it.each([
    '/precios.md',
    '/es/pricing.md',
    '/es/index.md',
    '/index.html.md',
    '/aviso-legal.md',
    '/nope.md',
    '/Pricing.md',
    '/pricing',
    '/llms.txt',
  ])('%s is not a markdown page', (pathname) => {
    expect(pagePathForMarkdown(pathname)).toBeUndefined();
  });
});

describe('markdownTarget', () => {
  function target(path: string, init: RequestInit = {}) {
    const url = new URL(`${SITE.url}${path}`);
    return markdownTarget(url, new Request(url, init));
  }

  it('renders a .md url as its html page without Vary', () => {
    const result = target('/es/precios.md?x=1');
    expect(result?.vary).toBe(false);
    expect(result?.upstream.url).toBe(`${SITE.url}/es/precios`);
    expect(result?.upstream.headers.get('Accept')).toBe('text/html');
  });

  it('keeps the url of a negotiated request and varies on Accept', () => {
    const result = target('/pricing?x=1', {
      headers: { Accept: 'text/markdown' },
    });
    expect(result?.vary).toBe(true);
    expect(result?.upstream.url).toBe(`${SITE.url}/pricing?x=1`);
  });

  it('keeps the abort signal of the original request', () => {
    const controller = new AbortController();
    const url = new URL(`${SITE.url}/pricing.md`);
    const result = markdownTarget(
      url,
      new Request(url, { signal: controller.signal }),
    );
    expect(result?.upstream.signal.aborted).toBe(false);
    controller.abort();
    expect(result?.upstream.signal.aborted).toBe(true);
  });

  it('leaves html requests and other methods alone', () => {
    expect(target('/pricing')).toBeUndefined();
    expect(target('/pricing.md', { method: 'POST' })).toBeUndefined();
  });
});
