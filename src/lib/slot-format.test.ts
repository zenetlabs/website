import { describe, expect, it } from 'vitest';
import {
  formatSlotDay,
  formatSlotLabel,
  formatSlotTime,
} from '@/lib/slot-format';

const TUESDAY_15_UTC = Date.UTC(2026, 10, 3, 7, 0);

describe('slot formatting', () => {
  it('writes English labels by hand', () => {
    expect(formatSlotDay('en', TUESDAY_15_UTC, 'Asia/Singapore')).toBe(
      'Tuesday 3 November',
    );
    expect(formatSlotTime('en', TUESDAY_15_UTC, 'Asia/Singapore')).toBe(
      '3:00 pm',
    );
    expect(formatSlotLabel('en', TUESDAY_15_UTC, 'Asia/Singapore')).toBe(
      'Tuesday 3 November, 3:00 pm',
    );
  });

  it('writes Spanish labels by hand', () => {
    expect(formatSlotDay('es', TUESDAY_15_UTC, 'Europe/Madrid')).toBe(
      'martes 3 de noviembre',
    );
    expect(formatSlotTime('es', TUESDAY_15_UTC, 'Europe/Madrid')).toBe('08:00');
    expect(formatSlotLabel('es', TUESDAY_15_UTC, 'Asia/Singapore')).toBe(
      'martes 3 de noviembre, 15:00',
    );
  });

  it('handles midnight and noon', () => {
    const midnight = Date.UTC(2026, 10, 3, 0, 0);
    expect(formatSlotTime('en', midnight, 'UTC')).toBe('12:00 am');
    expect(formatSlotTime('es', midnight, 'UTC')).toBe('00:00');
    expect(formatSlotTime('en', Date.UTC(2026, 10, 3, 12, 30), 'UTC')).toBe(
      '12:30 pm',
    );
  });

  it('uses only table words, digits and the separators we write', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const zone of [
        'Asia/Kolkata',
        'America/New_York',
        'Pacific/Auckland',
      ]) {
        const label = formatSlotLabel(locale, TUESDAY_15_UTC, zone);
        expect(label).toMatch(/^[\p{L}\d :,]+$/u);
        expect(label).not.toMatch(/[  ]/);
      }
    }
  });
});
