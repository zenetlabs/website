import { describe, expect, it } from 'vitest';
import {
  BOOKING_RULES,
  BOOKING_TIME_ZONES,
  DEFAULT_ZONE,
} from '@/content/booking-rules';
import { bookPage as enBook } from '@/content/en/book';
import { bookPage as esBook } from '@/content/es/book';
import { isTimeZone } from '@/lib/slots';

function minutes(clock: string): number {
  const [hours = 0, mins = 0] = clock.split(':').map(Number);
  return hours * 60 + mins;
}

describe('BOOKING_RULES', () => {
  it('has sorted, non-overlapping windows inside one day on the step grid', () => {
    const { windows, stepMinutes } = BOOKING_RULES;
    let previousEnd = 0;
    for (const window of windows) {
      expect(minutes(window.from)).toBeGreaterThanOrEqual(previousEnd);
      expect(minutes(window.to)).toBeGreaterThan(minutes(window.from));
      expect(minutes(window.to)).toBeLessThanOrEqual(24 * 60);
      expect(minutes(window.from) % stepMinutes).toBe(0);
      previousEnd = minutes(window.to);
    }
  });

  it('uses ISO weekdays and positive numbers', () => {
    expect(BOOKING_RULES.days.every((day) => day >= 1 && day <= 7)).toBe(true);
    for (const key of [
      'slotMinutes',
      'stepMinutes',
      'bufferMinutes',
      'maxPerDay',
      'minNoticeHours',
      'horizonDays',
      'holdSeconds',
    ] as const) {
      expect(BOOKING_RULES[key], key).toBeGreaterThan(0);
    }
    expect(isTimeZone(BOOKING_RULES.zone)).toBe(true);
  });
});

describe('BOOKING_TIME_ZONES', () => {
  it('lists only zones Intl accepts, once each', () => {
    expect(BOOKING_TIME_ZONES.every(isTimeZone)).toBe(true);
    expect(new Set(BOOKING_TIME_ZONES).size).toBe(BOOKING_TIME_ZONES.length);
    expect(BOOKING_TIME_ZONES).toContain(DEFAULT_ZONE.en);
    expect(BOOKING_TIME_ZONES).toContain(DEFAULT_ZONE.es);
  });

  it.each([
    ['en', enBook],
    ['es', esBook],
  ])('has a %s label for every zone and none extra', (_locale, book) => {
    expect(Object.keys(book.zone.zones).sort()).toEqual(
      [...BOOKING_TIME_ZONES].sort(),
    );
  });
});
