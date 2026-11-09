import { describe, expect, it } from 'vitest';
import { isChatEvent } from '@/lib/chat-events';

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
