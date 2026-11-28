import { describe, expect, it, vi } from 'vitest';
import { voiceCopy as en } from '@/content/en/voice';
import { voiceCopy as es } from '@/content/es/voice';
import { contactFormAsks } from '@/lib/contact-door';
import {
  contactDraftTool,
  navigateTool,
  pendingLabel,
} from '@/lib/voice-tools';

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

describe('pendingLabel', () => {
  const pending = {
    ok: true,
    result: { status: 'pending', label: 'Tuesday 3 November, 5:00 pm' },
  };

  it('reads the label of a held request', () => {
    expect(pendingLabel(JSON.stringify(pending))).toBe(
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
      { ok: true, result: { status: 'pending', label: 5 } },
    ],
    [
      'the old booked status',
      { ok: true, result: { status: 'booked', label: 'old' } },
    ],
    ['no result', { ok: true }],
    ['an array', []],
  ])('returns null for %s', (_label, value) => {
    expect(pendingLabel(JSON.stringify(value))).toBeNull();
  });

  it('returns null for malformed and truncated JSON', () => {
    expect(pendingLabel('{"ok":true,"result":{"status":"book')).toBeNull();
    expect(pendingLabel('')).toBeNull();
  });
});

describe('contactDraftTool', () => {
  function draft(locale: 'en' | 'es' = 'en', pathname = '/') {
    const push = vi.fn();
    const onOpened = vi.fn();
    const run = contactDraftTool({
      locale,
      copy: locale === 'en' ? en : es,
      push,
      pathname: () => pathname,
      onOpened,
    });
    return { run, push, onOpened };
  }

  it('opens the contact form with the message and names the page', async () => {
    const { run, push, onOpened } = draft('es', '/es/precios');
    expect(await run({ message: 'Quiero hablar de Holded' })).toBe('opened');
    expect(push).toHaveBeenCalledWith(
      '/es/contacto?message=Quiero+hablar+de+Holded',
    );
    expect(onOpened).toHaveBeenCalledWith(es.pages.contact);
  });

  it('opens the English form in the call locale', async () => {
    const { run, push } = draft('en', '/pricing');
    await run({ message: 'Sync Xero' });
    expect(push).toHaveBeenCalledWith('/contact?message=Sync+Xero');
  });

  it('says already_open on the contact page and pushes nothing', async () => {
    for (const [locale, path] of [
      ['en', '/contact'],
      ['es', '/es/contacto'],
    ] as const) {
      const { run, push, onOpened } = draft(locale, path);
      const before = contactFormAsks();
      expect(await run({ message: 'Hola' })).toBe('already_open');
      expect(contactFormAsks()).toBe(before + 1);
      expect(push).not.toHaveBeenCalled();
      expect(onOpened).not.toHaveBeenCalled();
    }
  });

  it('does not ask the contact page to open its form off the contact page', async () => {
    const { run } = draft('en', '/pricing');
    const before = contactFormAsks();
    await run({ message: 'Sync Xero' });
    expect(contactFormAsks()).toBe(before);
  });

  it.each([
    ['nothing', undefined],
    ['an empty message', { message: '  ' }],
    ['a message that is too long', { message: 'x'.repeat(1501) }],
    ['a non-string message', { message: 5 }],
    ['null', null],
  ])('says invalid for %s and never throws', async (_label, params) => {
    const { run, push } = draft();
    expect(await run(params)).toBe('invalid');
    expect(push).not.toHaveBeenCalled();
  });
});
