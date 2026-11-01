import { describe, expect, it, vi } from 'vitest';
import { voiceCopy as en } from '@/content/en/voice';
import { voiceCopy as es } from '@/content/es/voice';
import { bookedLabel, navigateTool } from '@/lib/voice-tools';

function tool(locale: 'en' | 'es' = 'en') {
  const push = vi.fn();
  const onOpened = vi.fn();
  const run = navigateTool({
    locale,
    copy: locale === 'en' ? en : es,
    push,
    onOpened,
  });
  return { run, push, onOpened };
}

describe('navigateTool', () => {
  it('opens a page of the call locale and names it', async () => {
    const { run, push, onOpened } = tool('es');
    expect(await run({ page: 'pricing' })).toBe('opened');
    expect(push).toHaveBeenCalledWith('/es/precios');
    expect(onOpened).toHaveBeenCalledWith(es.pages.pricing);
  });

  it('opens a home section and names the section', async () => {
    const { run, push, onOpened } = tool();
    expect(await run({ page: 'home', section: 'faq' })).toBe('opened');
    expect(push).toHaveBeenCalledWith('/#faq');
    expect(onOpened).toHaveBeenCalledWith(en.sections.faq);
  });

  it('names the page, not the section, when a section is sent for another page', async () => {
    const { run, onOpened } = tool();
    await run({ page: 'pricing', section: 'faq' });
    expect(onOpened).toHaveBeenCalledWith(en.pages.pricing);
  });

  it('says not_available for a page the locale or the flags do not have', async () => {
    const { run, push, onOpened } = tool('en');
    expect(await run({ page: 'verifactu' })).toBe('not_available');
    expect(push).not.toHaveBeenCalled();
    expect(onOpened).not.toHaveBeenCalled();
  });

  it.each([
    ['a URL', { page: 'https://evil.example' }],
    ['an unknown section', { page: 'home', section: 'admin' }],
    ['a missing page', {}],
    ['a string', 'pricing'],
    ['null', null],
  ])('says invalid for %s and goes nowhere', async (_label, params) => {
    const { run, push } = tool();
    expect(await run(params)).toBe('invalid');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('bookedLabel', () => {
  const booked = {
    ok: true,
    result: { status: 'booked', label: 'Tuesday 3 November, 5:00 pm' },
  };

  it('reads the label of a booked result', () => {
    expect(bookedLabel(JSON.stringify(booked))).toBe(
      'Tuesday 3 November, 5:00 pm',
    );
  });

  it.each([
    [
      'a rejection',
      { ok: true, result: { status: 'rejected', reason: 'limit' } },
    ],
    ['an error envelope', { ok: false, error: 'invalid' }],
    [
      'a label that is not text',
      { ok: true, result: { status: 'booked', label: 5 } },
    ],
    ['no result', { ok: true }],
    ['an array', []],
  ])('returns null for %s', (_label, value) => {
    expect(bookedLabel(JSON.stringify(value))).toBeNull();
  });

  it('returns null for malformed and truncated JSON', () => {
    expect(bookedLabel('{"ok":true,"result":{"status":"book')).toBeNull();
    expect(bookedLabel('')).toBeNull();
  });
});
