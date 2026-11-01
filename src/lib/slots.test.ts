import { describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '@/content/booking-rules';
import {
  type Availability,
  availableSlots,
  candidateSlots,
  canonicalZone,
  checkSlot,
  formatterCacheSize,
  groupByDay,
  isTimeZone,
  type Slot,
  zonedParts,
  zonedToInstant,
} from '@/lib/slots';

const MADRID = 'Europe/Madrid';
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function utc(year: number, month: number, day: number, hour = 0, minute = 0) {
  return Date.UTC(year, month - 1, day, hour, minute);
}

function madrid(year: number, month: number, day: number, at: string) {
  const [hours = 0, minutes = 0] = at.split(':').map(Number);
  const instant = zonedToInstant(
    { year, month, day },
    hours * 60 + minutes,
    MADRID,
  );
  if (instant === null) throw new Error('not a real Madrid time');
  return instant;
}

function slotAt(year: number, month: number, day: number, at: string): Slot {
  const start = madrid(year, month, day, at);
  return {
    start,
    end: start + 30 * MINUTE,
    day: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function times(slots: readonly Slot[]): string[] {
  return slots.map((slot) => {
    const { hour, minute } = zonedParts(slot.start, MADRID);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });
}

const MONDAY = { year: 2027, month: 1, day: 11 };
const FAR_NOW = utc(2027, 1, 1);

function availability(overrides: Partial<Availability> = {}): Availability {
  return {
    rules: BOOKING_RULES,
    now: FAR_NOW,
    busy: [],
    booked: [],
    ...overrides,
  };
}

function mondayTimes(overrides: Partial<Availability> = {}) {
  return times(
    availableSlots(
      availability({
        from: madrid(2027, 1, 11, '00:00'),
        to: madrid(2027, 1, 12, '00:00'),
        ...overrides,
      }),
    ),
  );
}

describe('zonedParts', () => {
  it('reads Madrid wall time in winter (UTC+1) and summer (UTC+2)', () => {
    expect(zonedParts(utc(2027, 1, 11, 8), MADRID)).toMatchObject({
      hour: 9,
      minute: 0,
      weekday: 1,
    });
    expect(zonedParts(utc(2027, 7, 12, 7), MADRID)).toMatchObject({
      hour: 9,
      weekday: 1,
    });
  });

  it('never returns 24:00 at midnight', () => {
    expect(zonedParts(utc(2027, 1, 10, 23), MADRID)).toMatchObject({
      day: 11,
      hour: 0,
    });
  });
});

describe('zonedToInstant', () => {
  it('maps a Madrid wall time to the right instant in both seasons', () => {
    expect(zonedToInstant(MONDAY, 9 * 60, MADRID)).toBe(utc(2027, 1, 11, 8));
    expect(
      zonedToInstant({ year: 2027, month: 7, day: 12 }, 9 * 60, MADRID),
    ).toBe(utc(2027, 7, 12, 7));
  });

  it('returns null inside the spring gap (2027-03-28 02:30 does not exist)', () => {
    const gap = { year: 2027, month: 3, day: 28 };
    expect(zonedToInstant(gap, 2 * 60 + 30, MADRID)).toBeNull();
    expect(zonedToInstant(gap, 3 * 60 + 30, MADRID)).toBe(
      utc(2027, 3, 28, 1, 30),
    );
  });

  it('resolves the repeated autumn hour to one of its two instants', () => {
    const repeated = zonedToInstant(
      { year: 2026, month: 10, day: 25 },
      2 * 60 + 30,
      MADRID,
    );
    expect([utc(2026, 10, 25, 0, 30), utc(2026, 10, 25, 1, 30)]).toContain(
      repeated,
    );
  });
});

describe('candidateSlots', () => {
  const week = candidateSlots(
    BOOKING_RULES,
    madrid(2027, 1, 11, '00:00'),
    madrid(2027, 1, 18, '00:00'),
  );

  it('offers 20 half-hours on each of the five weekdays, 08:00 to 17:30', () => {
    expect(week).toHaveLength(100);
    const monday = times(week.filter((slot) => slot.day === '2027-01-11'));
    expect(monday).toHaveLength(20);
    expect(monday[0]).toBe('08:00');
    expect(monday.at(-1)).toBe('17:30');
  });

  it('skips weekends', () => {
    const weekdays = new Set(
      week.map((slot) => zonedParts(slot.start, MADRID).weekday),
    );
    expect([...weekdays].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the wall-clock grid across both EU changes', () => {
    for (const [from, to] of [
      [madrid(2027, 3, 22, '00:00'), madrid(2027, 4, 2, '00:00')],
      [madrid(2026, 10, 19, '00:00'), madrid(2026, 10, 30, '00:00')],
    ] as const) {
      const slots = candidateSlots(BOOKING_RULES, from, to);
      expect(slots).toHaveLength(180);
      expect(new Set(times(slots)).size).toBe(20);
    }
  });

  it('is deterministic', () => {
    expect(
      candidateSlots(BOOKING_RULES, utc(2027, 1, 1), utc(2027, 2, 1)),
    ).toEqual(candidateSlots(BOOKING_RULES, utc(2027, 1, 1), utc(2027, 2, 1)));
  });
});

describe('a DST change inside a window', () => {
  const NIGHT = {
    ...BOOKING_RULES,
    days: [7],
    windows: [{ from: '01:00', to: '04:00' }],
  };

  it('drops the wall times that do not exist in spring and keeps the rest on the grid', () => {
    const slots = candidateSlots(NIGHT, utc(2027, 3, 28), utc(2027, 3, 29));
    expect(slots.map((slot) => slot.start)).toEqual([
      utc(2027, 3, 28, 0, 0),
      utc(2027, 3, 28, 0, 30),
      utc(2027, 3, 28, 1, 0),
      utc(2027, 3, 28, 1, 30),
    ]);
  });

  it('keeps every wall time once in autumn', () => {
    const slots = candidateSlots(NIGHT, utc(2026, 10, 24), utc(2026, 10, 26));
    expect(slots).toHaveLength(6);
    expect(new Set(slots.map((slot) => slot.start)).size).toBe(6);
    expect(times(slots)).toEqual([
      '01:00',
      '01:30',
      '02:00',
      '02:30',
      '03:00',
      '03:30',
    ]);
  });
});

describe('availableSlots', () => {
  const start = madrid(2027, 1, 18, '09:00');
  const only = (now: number) =>
    availableSlots(availability({ now, from: start, to: start + 1 }));

  it('allows exactly 12 hours of notice and not a minute less', () => {
    expect(only(start - 12 * HOUR)).toHaveLength(1);
    expect(only(start - 12 * HOUR + MINUTE)).toHaveLength(0);
  });

  it('stops at the horizon', () => {
    const now = madrid(2027, 1, 4, '09:00');
    const inside = availableSlots(
      availability({
        now,
        from: now + 14 * DAY - 30 * MINUTE,
        to: now + 14 * DAY,
      }),
    );
    expect(times(inside)).toEqual(['08:30']);
    expect(
      availableSlots(
        availability({ now, from: now + 14 * DAY, to: now + 15 * DAY }),
      ),
    ).toEqual([]);
  });

  it('keeps a 15 minute buffer around busy time', () => {
    const busy = [
      {
        start: madrid(2027, 1, 11, '10:10'),
        end: madrid(2027, 1, 11, '10:50'),
      },
    ];
    const left = mondayTimes({ busy });
    for (const gone of ['09:30', '10:00', '10:30', '11:00']) {
      expect(left, gone).not.toContain(gone);
    }
    for (const kept of ['09:00', '11:30']) expect(left, kept).toContain(kept);
  });

  it('keeps a 15 minute buffer around a booking', () => {
    const left = mondayTimes({ booked: [slotAt(2027, 1, 11, '09:00')] });
    expect(left).not.toContain('09:00');
    expect(left).not.toContain('09:30');
    expect(left).toContain('10:00');
    expect(left).not.toContain('08:30');
    expect(left).toContain('08:00');
  });

  it('empties a day once three bookings exist and keeps it at two', () => {
    const two = [slotAt(2027, 1, 11, '08:00'), slotAt(2027, 1, 11, '12:00')];
    expect(mondayTimes({ booked: two }).length).toBeGreaterThan(0);
    expect(
      mondayTimes({ booked: [...two, slotAt(2027, 1, 11, '16:00')] }),
    ).toEqual([]);
  });

  it('counts bookings per owner-zone day, not per visitor day', () => {
    const three = ['08:00', '12:00', '16:00'].map((at) =>
      slotAt(2027, 1, 11, at),
    );
    expect(
      times(
        availableSlots(
          availability({
            booked: three,
            from: madrid(2027, 1, 12, '00:00'),
            to: madrid(2027, 1, 13, '00:00'),
          }),
        ),
      ),
    ).toHaveLength(20);
  });
});

describe('checkSlot', () => {
  const base = availability();

  it('accepts a free slot', () => {
    expect(checkSlot(madrid(2027, 1, 11, '10:00'), base)).toMatchObject({
      status: 'ok',
      slot: { day: '2027-01-11' },
    });
  });

  it.each([
    ['off the grid', madrid(2027, 1, 11, '10:10')],
    ['on a weekend', madrid(2027, 1, 16, '10:00')],
    ['outside the windows', madrid(2027, 1, 11, '19:00')],
    ['under the notice', FAR_NOW + 11 * HOUR],
    ['past the horizon', FAR_NOW + 20 * DAY],
  ])('rejects a slot %s as invalid', (_label, start) => {
    expect(checkSlot(start, base).status).toBe('invalid');
  });

  it('reports a busy slot as taken and a full day as full', () => {
    const start = madrid(2027, 1, 11, '10:00');
    expect(
      checkSlot(start, {
        ...base,
        busy: [{ start, end: start + 30 * MINUTE }],
      }),
    ).toEqual({ status: 'taken' });
    const three = ['08:00', '12:00', '16:00'].map((at) =>
      slotAt(2027, 1, 11, at),
    );
    expect(checkSlot(start, { ...base, booked: three })).toEqual({
      status: 'full',
    });
  });
});

describe('groupByDay', () => {
  const monday8 = madrid(2027, 1, 11, '08:00');
  const summer8 = madrid(2027, 7, 12, '08:00');
  const first = (instant: number, zone: string) =>
    groupByDay([{ start: instant, end: instant + 30 * MINUTE }], zone)[0]?.date;

  it('shows Madrid Monday 08:00 as Singapore 15:00 in winter and 14:00 in summer', () => {
    expect(zonedParts(monday8, 'Asia/Singapore')).toMatchObject({
      day: 11,
      hour: 15,
    });
    expect(zonedParts(summer8, 'Asia/Singapore')).toMatchObject({
      day: 12,
      hour: 14,
    });
  });

  it('moves the date for far zones', () => {
    expect(first(madrid(2027, 1, 11, '09:00'), 'America/Los_Angeles')).toBe(
      '2027-01-11',
    );
    expect(
      zonedParts(madrid(2027, 1, 11, '09:00'), 'America/Los_Angeles'),
    ).toMatchObject({
      hour: 0,
    });
    expect(
      zonedParts(madrid(2027, 1, 11, '09:00'), 'Asia/Kolkata'),
    ).toMatchObject({
      hour: 13,
      minute: 30,
    });
    expect(
      zonedParts(madrid(2027, 1, 11, '09:00'), 'Asia/Kathmandu'),
    ).toMatchObject({
      hour: 13,
      minute: 45,
    });
  });

  it('follows the US-only offset weeks (5 hours instead of 6)', () => {
    const slot = madrid(2027, 3, 22, '09:00');
    expect(zonedParts(slot, 'America/New_York').hour).toBe(4);
    expect(
      zonedParts(madrid(2027, 1, 11, '09:00'), 'America/New_York').hour,
    ).toBe(3);
  });

  it('groups consecutive slots by the visitor date', () => {
    const slots = candidateSlots(
      BOOKING_RULES,
      madrid(2027, 1, 11, '00:00'),
      madrid(2027, 1, 13, '00:00'),
    );
    expect(groupByDay(slots, MADRID).map((day) => day.date)).toEqual([
      '2027-01-11',
      '2027-01-12',
    ]);
    expect(groupByDay([], MADRID)).toEqual([]);
  });
});

describe('isTimeZone', () => {
  it.each([
    'Europe/Madrid',
    'UTC',
    'Asia/Kathmandu',
    'America/Argentina/Buenos_Aires',
  ])('accepts %s', (zone) => expect(isTimeZone(zone)).toBe(true));

  it.each([
    'Mars/Base',
    '',
    'a'.repeat(80),
    '+01:00',
    'Europe/Madrid; DROP',
    '../etc',
  ])('rejects %j', (zone) => expect(isTimeZone(zone)).toBe(false));
});

describe('the formatter cache', () => {
  function variants(count: number): string[] {
    const base = 'Asia/Singapore';
    return Array.from({ length: count }, (_, index) =>
      [...base]
        .map((char, at) =>
          (index >> at) & 1 ? char.toUpperCase() : char.toLowerCase(),
        )
        .join(''),
    );
  }

  it('is keyed by the canonical name, so a thousand case variants add one entry', () => {
    const before = formatterCacheSize();
    zonedParts(Date.UTC(2027, 0, 11), variants(1)[0] ?? 'Asia/Singapore');
    const first = formatterCacheSize();
    expect(first - before).toBeLessThanOrEqual(1);
    const all = variants(1000);
    expect(new Set(all).size).toBeGreaterThan(400);
    for (const variant of all) {
      expect(isTimeZone(variant)).toBe(true);
      zonedParts(Date.UTC(2027, 0, 11), variant);
    }
    expect(formatterCacheSize()).toBe(first);
    expect(canonicalZone('asia/SINGAPORE')).toBe(
      canonicalZone('Asia/Singapore'),
    );
  });

  it('does not cache invalid input at all', () => {
    const before = formatterCacheSize();
    for (const bad of ['Mars/Base', 'x'.repeat(100), '../etc']) {
      expect(canonicalZone(bad)).toBeNull();
    }
    expect(formatterCacheSize()).toBe(before);
  });
});
