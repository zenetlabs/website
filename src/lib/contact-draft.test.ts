import { describe, expect, it } from 'vitest';
import {
  AGENT_MESSAGE_MAX,
  agentMessage,
  contactDraftTarget,
} from '@/lib/contact-draft';
import { CONTACT_MESSAGE_MAX } from '@/lib/contact-message';

describe('agentMessage', () => {
  it('trims, normalises compatibility characters and strips invisible ones', () => {
    expect(agentMessage('  Sync\u200b orders\u00a0today  ')).toBe(
      'Sync orders today',
    );
    expect(agentMessage('ＸＥＲＯ')).toBe('XERO');
  });

  it('keeps line breaks and drops other control characters', () => {
    expect(agentMessage('one\ntwo\u0007three')).toBe('one\ntwo three');
  });

  it('accepts exactly the limit and nothing longer', () => {
    expect(agentMessage('x'.repeat(AGENT_MESSAGE_MAX))).toHaveLength(
      AGENT_MESSAGE_MAX,
    );
    expect(agentMessage('x'.repeat(AGENT_MESSAGE_MAX + 1))).toBeNull();
  });

  it.each([[''], ['   '], ['\u200b\u200b'], [null], [undefined], [42], [{}]])(
    'rejects %j',
    (value) => {
      expect(agentMessage(value)).toBeNull();
    },
  );

  it('stays a message the contact form takes', () => {
    expect(AGENT_MESSAGE_MAX).toBeLessThanOrEqual(CONTACT_MESSAGE_MAX);
  });
});

describe('contactDraftTarget', () => {
  it('points at the contact form of the locale with the message in it', () => {
    expect(contactDraftTarget('en', '/pricing', 'Sync Xero')).toEqual({
      url: '/contact?message=Sync+Xero',
    });
    expect(contactDraftTarget('es', '/es/precios', 'Hola')).toEqual({
      url: '/es/contacto?message=Hola',
    });
  });

  it('is current, with no url, on the contact page', () => {
    expect(contactDraftTarget('en', '/contact', 'x')).toEqual({
      current: true,
    });
    expect(contactDraftTarget('es', '/es/contacto', 'x')).toEqual({
      current: true,
    });
  });

  it('is null for anything that is not a message', () => {
    for (const message of ['', '  ', 'x'.repeat(1501), 5, null, undefined]) {
      expect(contactDraftTarget('en', '/', message)).toBeNull();
    }
  });
});
