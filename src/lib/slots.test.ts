import { describe, expect, it, vi } from 'vitest';
import {
  BOOKING_HOLIDAYS,
  type BookingHoliday,
} from '@/content/booking-holidays';
import { BOOKING_RULES } from '@/content/booking-rules';
import {
  canonicalZone,
  formatterCacheSize,
  groupByDay,
  isoWeekday,
  isTimeZone,
  type Slot,
  zonedParts,
  zonedToInstant,
} from '@/lib/slots';
import {
  type Availability,
  availableSlots,
  bookingCalendar,
  candidateSlots,
  checkSlot,
  ruleDays,
} from '@/server/booking-slots';

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

  it('offers 12 half-hours from Monday to Thursday, 10:00 to 15:30', () => {
    expect(week).toHaveLength(48);
    const monday = times(week.filter((slot) => slot.day === '2027-01-11'));
    expect(monday).toHaveLength(12);
    expect(monday[0]).toBe('10:00');
    expect(monday.at(-1)).toBe('15:30');
    const last = week.at(-1);
    expect(last && zonedParts(last.end, MADRID)).toMatchObject({
      hour: 16,
      minute: 0,
    });
  });

  it('skips Fridays and weekends', () => {
    const weekdays = new Set(
      week.map((slot) => zonedParts(slot.start, MADRID).weekday),
    );
    expect([...weekdays].sort()).toEqual([1, 2, 3, 4]);
  });

  it('keeps the wall-clock grid across both EU changes', () => {
    // 22 March to 1 April 2027: seven working days (Easter Monday is a
    // Catalan holiday); 19 to 29 October 2026: eight.
    for (const [from, to, days] of [
      [madrid(2027, 3, 22, '00:00'), madrid(2027, 4, 2, '00:00'), 7],
      [madrid(2026, 10, 19, '00:00'), madrid(2026, 10, 30, '00:00'), 8],
    ] as const) {
      const slots = candidateSlots(BOOKING_RULES, from, to);
      expect(slots).toHaveLength(days * 12);
      expect(new Set(times(slots)).size).toBe(12);
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
  const start = madrid(2027, 1, 18, '10:00');
  const only = (now: number) =>
    availableSlots(availability({ now, from: start, to: start + 1 }));

  it('allows exactly 12 hours of notice and not a minute less', () => {
    expect(only(start - 12 * HOUR)).toHaveLength(1);
    expect(only(start - 12 * HOUR + MINUTE)).toHaveLength(0);
  });

  it('stops at the horizon', () => {
    const now = madrid(2027, 1, 4, '10:30');
    const inside = availableSlots(
      availability({
        now,
        from: now + 14 * DAY - 30 * MINUTE,
        to: now + 14 * DAY,
      }),
    );
    expect(times(inside)).toEqual(['10:00']);
    expect(
      availableSlots(
        availability({ now, from: now + 14 * DAY, to: now + 15 * DAY }),
      ),
    ).toEqual([]);
  });

  it('keeps a 15 minute buffer around busy time', () => {
    const busy = [
      {
        start: madrid(2027, 1, 11, '12:10'),
        end: madrid(2027, 1, 11, '12:50'),
      },
    ];
    const left = mondayTimes({ busy });
    for (const gone of ['11:30', '12:00', '12:30', '13:00']) {
      expect(left, gone).not.toContain(gone);
    }
    for (const kept of ['11:00', '13:30']) expect(left, kept).toContain(kept);
  });

  it('keeps a 15 minute buffer around a booking', () => {
    const left = mondayTimes({ booked: [slotAt(2027, 1, 11, '12:00')] });
    expect(left).not.toContain('12:00');
    expect(left).not.toContain('12:30');
    expect(left).toContain('13:00');
    expect(left).not.toContain('11:30');
    expect(left).toContain('11:00');
  });

  it('empties a day once three bookings exist and keeps it at two', () => {
    const two = [slotAt(2027, 1, 11, '10:00'), slotAt(2027, 1, 11, '12:00')];
    expect(mondayTimes({ booked: two }).length).toBeGreaterThan(0);
    expect(
      mondayTimes({ booked: [...two, slotAt(2027, 1, 11, '14:00')] }),
    ).toEqual([]);
  });

  it('counts bookings per owner-zone day, not per visitor day', () => {
    const three = ['10:00', '12:00', '14:00'].map((at) =>
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
    ).toHaveLength(12);
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
    ['before the window opens', madrid(2027, 1, 11, '09:30')],
    ['when the window has closed', madrid(2027, 1, 11, '16:00')],
    ['on a Friday', madrid(2027, 1, 15, '10:00')],
    ['on a Catalan holiday', madrid(2027, 3, 29, '10:00')],
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
    const three = ['10:30', '12:00', '14:00'].map((at) =>
      slotAt(2027, 1, 11, at),
    );
    expect(checkSlot(start, { ...base, booked: three })).toEqual({
      status: 'full',
    });
  });
});

describe('holidays', () => {
  const dayOf = (date: string) => {
    const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
    return candidateSlots(
      BOOKING_RULES,
      madrid(year, month, day, '00:00'),
      madrid(year, month, day, '23:59'),
    );
  };

  it.each([
    ['a Spanish one', '2026-12-08'],
    ['Epiphany', '2027-01-06'],
    ['a Catalan one', '2027-03-29'],
    ['a Singapore one', '2027-03-10'],
    ['a Singapore Monday after a Sunday holiday', '2026-11-09'],
  ])('closes the whole day on %s', (_label, date) => {
    expect(dayOf(date)).toEqual([]);
  });

  it('keeps the working days around them', () => {
    expect(dayOf('2026-12-09')).toHaveLength(12);
    expect(dayOf('2027-01-07')).toHaveLength(12);
  });

  it('closes every listed holiday that falls on a working day', () => {
    for (const { date } of BOOKING_HOLIDAYS) {
      const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
      if (isoWeekday({ year, month, day }) > 4) continue;
      expect(dayOf(date), date).toEqual([]);
    }
  });

  it('closes a day when a holiday in either zone touches any part of its window', () => {
    // 16:00-18:00 Madrid in January is 23:00-01:00 in Singapore, so a
    // Singapore holiday on the 12th closes Madrid's 11th and 12th.
    const late = {
      ...BOOKING_RULES,
      windows: [{ from: '16:00', to: '18:00' }],
      holidays: [
        ...BOOKING_HOLIDAYS,
        {
          date: '2027-01-12',
          region: 'SG',
          name: { en: 'Test', es: 'Prueba' },
        } satisfies BookingHoliday,
      ],
    };
    const days = ruleDays(
      late,
      madrid(2027, 1, 11, '00:00'),
      madrid(2027, 1, 14, '00:00'),
    );
    expect(days.map(({ day, holidays }) => [day, holidays.length > 0])).toEqual(
      [
        ['2027-01-11', true],
        ['2027-01-12', true],
        ['2027-01-13', false],
      ],
    );
    expect(
      new Set(
        candidateSlots(
          late,
          madrid(2027, 1, 11, '00:00'),
          madrid(2027, 1, 14, '00:00'),
        ).map((slot) => slot.day),
      ),
    ).toEqual(new Set(['2027-01-13']));
  });
});

describe('a holiday list that has run out', () => {
  it('closes every day past its last year and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const stale = {
      ...BOOKING_RULES,
      holidays: BOOKING_HOLIDAYS.filter(({ date }) => date < '2027-01-01'),
    };
    const from = madrid(2026, 12, 28, '00:00');
    const to = madrid(2027, 1, 8, '00:00');
    const days = new Set(
      candidateSlots(stale, from, to).map((slot) => slot.day),
    );
    expect([...days]).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
    ]);
    candidateSlots(stale, from, to);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('booking: holidays not listed', {
      after: '2026-12-31',
    });
    const calendar = bookingCalendar(stale, madrid(2026, 12, 28, '09:00'));
    expect(calendar.to).toBe(madrid(2027, 1, 4, '10:00'));
    warn.mockRestore();
  });
});

describe('the Shanghai bound', () => {
  const SHANGHAI = 'Asia/Shanghai';
  const endsIn = (slots: readonly Slot[]) =>
    slots.map((slot) => {
      const end = zonedParts(slot.end, SHANGHAI);
      const start = zonedParts(slot.start, SHANGHAI);
      expect(end.day, 'same Shanghai day').toBe(start.day);
      return end.hour * 60 + end.minute;
    });

  it('ends every call by 23:00 in Shanghai in winter, the last exactly then', () => {
    const ends = endsIn(
      candidateSlots(BOOKING_RULES, utc(2027, 1, 1), utc(2027, 2, 28)),
    );
    expect(Math.max(...ends)).toBe(23 * 60);
  });

  it('ends every call by 22:00 in Shanghai in summer', () => {
    const ends = endsIn(
      candidateSlots(BOOKING_RULES, utc(2027, 6, 1), utc(2027, 8, 31)),
    );
    expect(Math.max(...ends)).toBe(22 * 60);
  });

  it('stays inside the bound in the week the clocks change', () => {
    const slots = candidateSlots(
      BOOKING_RULES,
      utc(2027, 3, 22),
      utc(2027, 4, 2),
    );
    expect(Math.max(...endsIn(slots))).toBeLessThanOrEqual(23 * 60);
    expect(new Set(times(slots))).toEqual(
      new Set(times(slots.filter((slot) => slot.day === '2027-03-22'))),
    );
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
