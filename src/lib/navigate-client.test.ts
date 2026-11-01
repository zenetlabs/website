import { describe, expect, it, vi } from 'vitest';
import { locales } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { NAVIGATE_SECTIONS } from '@/lib/navigate';
import { parseNavigateInput, runNavigate } from '@/lib/navigate-client';
import { PAGE_IDS } from '@/lib/page-registry';

function deps(pathname: string) {
  const assign = vi.fn();
  const tasks: Array<() => void> = [];
  return {
    assign,
    tasks,
    value: {
      pathname: () => pathname,
      schedule: (run: () => void) => {
        tasks.push(run);
      },
      assign,
    },
  };
}

function urlOf(result: unknown): string {
  return isRecord(result) && typeof result.url === 'string' ? result.url : '';
}

const HOSTILE: unknown[] = [
  null,
  'pricing',
  7,
  [],
  {},
  { page: 'nope' },
  { page: '/pricing' },
  { page: 'https://evil.example' },
  { page: '//evil.example' },
  { page: 'javascript:alert(1)' },
  { page: 'home', section: 'x' },
  { page: 'home', section: 'faq#x' },
  { page: 'home', section: null },
  { page: 'home', section: '/\\evil.example' },
];

describe('parseNavigateInput', () => {
  it.each(HOSTILE)('rejects %j', (input) => {
    expect(parseNavigateInput(input).ok).toBe(false);
  });

  it('accepts a registry page with or without a section', () => {
    expect(parseNavigateInput({ page: 'pricing' })).toEqual({
      ok: true,
      page: 'pricing',
      section: undefined,
    });
    expect(parseNavigateInput({ page: 'home', section: 'faq' })).toEqual({
      ok: true,
      page: 'home',
      section: 'faq',
    });
  });
});

describe('runNavigate', () => {
  it('turns a rejected input into an invalid envelope and never moves', () => {
    const run = deps('/');
    for (const input of HOSTILE) {
      const envelope = runNavigate(input, run.value);
      expect(envelope).toMatchObject({ ok: false, error: 'invalid' });
    }
    expect(run.tasks).toHaveLength(0);
  });

  it('resolves pages in the locale of the current page, ignoring the agent', () => {
    const en = deps('/about');
    expect(runNavigate({ page: 'pricing', locale: 'es' }, en.value)).toEqual({
      ok: true,
      result: { url: '/pricing' },
    });
    const es = deps('/es/sobre-nosotros');
    expect(runNavigate({ page: 'pricing', locale: 'en' }, es.value)).toEqual({
      ok: true,
      result: { url: '/es/precios' },
    });
    expect(
      runNavigate({ page: 'home', section: 'faq' }, es.value),
    ).toMatchObject({ result: { url: '/es#faq' } });
    expect(runNavigate({ page: 'home', section: 'faq' }, en.value)).toEqual({
      ok: true,
      result: { url: '/#faq' },
    });
  });

  it('schedules the move after the result is returned', () => {
    const run = deps('/pricing');
    runNavigate({ page: 'home', section: 'faq' }, run.value);
    expect(run.assign).not.toHaveBeenCalled();
    expect(run.tasks).toHaveLength(1);
    run.tasks[0]?.();
    expect(run.assign).toHaveBeenCalledExactlyOnceWith('/#faq');
  });

  it('does not reload the current page', () => {
    const run = deps('/pricing');
    expect(runNavigate({ page: 'pricing' }, run.value)).toEqual({
      ok: true,
      result: { url: '/pricing', current: true },
    });
    expect(run.tasks).toHaveLength(0);
  });

  it('reports pages the locale or the flags do not offer', () => {
    const run = deps('/');
    expect(runNavigate({ page: 'legalNotice' }, run.value)).toEqual({
      ok: false,
      error: 'unknown_target',
    });
    expect(runNavigate({ page: 'book' }, run.value)).toEqual({
      ok: false,
      error: 'unknown_target',
    });
    expect(run.tasks).toHaveLength(0);
  });

  it('only ever produces same-origin paths', () => {
    for (const locale of locales) {
      const pathname = locale === 'en' ? '/x' : '/es/x';
      for (const page of PAGE_IDS) {
        for (const section of [undefined, ...NAVIGATE_SECTIONS]) {
          const envelope = runNavigate({ page, section }, deps(pathname).value);
          if (!envelope.ok) continue;
          const url = urlOf(envelope.result);
          expect(url.startsWith('/')).toBe(true);
          expect(url.startsWith('//')).toBe(false);
          expect(url).not.toContain(':');
          expect(new URL(url, 'https://zenetlabs.com').origin).toBe(
            'https://zenetlabs.com',
          );
        }
      }
    }
  });
});
