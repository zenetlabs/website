import { describe, expect, it } from 'vitest';
import {
  BOOKING_HOLIDAYS,
  HOLIDAY_SOURCES,
  HOLIDAY_ZONES,
  HOLIDAYS_CHECKED_ON,
  holidaysCoverUntil,
} from '@/content/booking-holidays';
import { isoWeekday } from '@/lib/slots';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(date: string): boolean {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

describe('BOOKING_HOLIDAYS', () => {
  it('lists real dates, each once per region, with both names', () => {
    const seen = new Set<string>();
    for (const holiday of BOOKING_HOLIDAYS) {
      expect(holiday.date).toMatch(DATE);
      expect(isRealDate(holiday.date), holiday.date).toBe(true);
      expect(Object.keys(HOLIDAY_ZONES)).toContain(holiday.region);
      expect(holiday.name.en.trim()).not.toBe('');
      expect(holiday.name.es.trim()).not.toBe('');
      const key = `${holiday.region} ${holiday.date}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  // Refreshed yearly (docs/RUNBOOK.md section 14): from mid-November the
  // list must already hold next year for every place, which BOE, DOGC and
  // MOM have all published by then.
  it('lists the year of today + 45 days for ES, CT and SG', () => {
    const year = String(
      new Date(Date.now() + 45 * 86_400_000).getUTCFullYear(),
    );
    for (const region of ['ES', 'CT', 'SG'] as const) {
      expect(
        BOOKING_HOLIDAYS.some(
          (holiday) =>
            holiday.region === region && holiday.date.startsWith(`${year}-`),
        ),
        `no ${region} holidays for ${year}: add them from the BOE, the DOGC and MOM`,
      ).toBe(true);
    }
  });

  it('keeps Christmas and New Year in every year it covers, in every place', () => {
    const years = new Set(BOOKING_HOLIDAYS.map(({ date }) => date.slice(0, 4)));
    for (const year of years) {
      for (const region of ['ES', 'SG'] as const) {
        const dates = BOOKING_HOLIDAYS.filter(
          (holiday) => holiday.region === region,
        ).map(({ date }) => date);
        expect(dates, `${region} ${year}`).toContain(`${year}-01-01`);
        expect(dates, `${region} ${year}`).toContain(`${year}-12-25`);
      }
    }
  });

  it('has the Catalan days that fall on a working day', () => {
    const catalan = BOOKING_HOLIDAYS.filter(({ region }) => region === 'CT');
    expect(catalan.map(({ date }) => date)).toEqual(
      expect.arrayContaining(['2026-04-06', '2027-03-29', '2027-06-24']),
    );
    expect(
      catalan.some(({ date }) => {
        const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
        return isoWeekday({ year, month, day }) <= 4;
      }),
    ).toBe(true);
  });

  it('covers through the end of the earliest last year of any place', () => {
    expect(holidaysCoverUntil(BOOKING_HOLIDAYS)).toBe('2027-12-31');
    expect(
      holidaysCoverUntil(
        BOOKING_HOLIDAYS.filter(
          ({ date, region }) => region !== 'CT' || date < '2027-01-01',
        ),
      ),
    ).toBe('2026-12-31');
    expect(holidaysCoverUntil([])).toBe('0000-12-31');
  });

  it('names its sources and the day they were checked', () => {
    expect(HOLIDAYS_CHECKED_ON).toMatch(DATE);
    for (const urls of Object.values(HOLIDAY_SOURCES)) {
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) expect(url).toMatch(/^https:\/\//);
    }
  });
});
