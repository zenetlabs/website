import { describe, expect, it } from 'vitest';
import { isChatEvent } from '@/lib/chat-events';

describe('isChatEvent: contact_draft', () => {
  it('accepts a message of 1 to 1,500 characters and nothing else', () => {
    expect(isChatEvent({ t: 'contact_draft', message: 'Sync orders' })).toBe(
      true,
    );
    expect(isChatEvent({ t: 'contact_draft', message: 'x'.repeat(1500) })).toBe(
      true,
    );
    for (const message of ['', 'x'.repeat(1501), 5, null, undefined, {}]) {
      expect(isChatEvent({ t: 'contact_draft', message })).toBe(false);
    }
  });

  it('carries no href: the client builds the link itself', () => {
    expect(
      isChatEvent({
        t: 'contact_draft',
        message: 'Hi',
        href: 'https://evil.example',
      }),
    ).toBe(true);
  });
});

describe('isChatEvent: slots', () => {
  it('accepts up to eight starts in a zone the browser can use', () => {
    expect(
      isChatEvent({ t: 'slots', zone: 'Europe/Madrid', starts: [1, 2, 3] }),
    ).toBe(true);
  });

  it('rejects a zone Intl cannot use, more than eight starts, or non-integers', () => {
    expect(isChatEvent({ t: 'slots', zone: 'Mars/Base', starts: [1] })).toBe(
      false,
    );
    expect(
      isChatEvent({
        t: 'slots',
        zone: 'UTC',
        starts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      }),
    ).toBe(false);
    expect(isChatEvent({ t: 'slots', zone: 'UTC', starts: [1.5] })).toBe(false);
  });
});
