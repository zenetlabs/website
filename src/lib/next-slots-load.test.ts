import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextSlots, SHOWN_SLOTS } from '@/lib/next-slots-load';

const HOUR = 3_600_000;
// Monday 11 January 2027, 09:00 in Madrid (08:00 UTC).
const MONDAY = Date.UTC(2027, 0, 11, 8);

function zone(name: string) {
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat().resolvedOptions(),
    timeZone: name,
  });
}

function slots(...starts: number[]) {
  return starts.map((start) => ({ start, end: start + HOUR / 2 }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the next free times on the desk', () => {
  it('shows at most three times of the first free day, in the visitor zone, hand-formatted', async () => {
    zone('Europe/Madrid');
    const ready = await nextSlots(
      {
        status: 'ok',
        slots: slots(
          MONDAY,
          MONDAY + HOUR,
          MONDAY + 2 * HOUR,
          MONDAY + 3 * HOUR,
          MONDAY + 24 * HOUR,
        ),
      },
      'en',
    );
    expect(ready?.day).toBe('Monday 11 January');
    expect(ready?.zone).toBe('Madrid');
    expect(ready?.chips).toHaveLength(SHOWN_SLOTS);
    expect(ready?.chips.map((chip) => chip.time)).toEqual([
      '9:00 am',
      '10:00 am',
      '11:00 am',
    ]);
    expect(ready?.chips[0]?.label).toBe('Monday 11 January, 9:00 am');
  });

  it('shows a single time when the day has only one, in Spanish with the 24-hour clock', async () => {
    zone('Asia/Singapore');
    const ready = await nextSlots({ status: 'ok', slots: slots(MONDAY) }, 'es');
    expect(ready?.day).toBe('lunes 11 de enero');
    expect(ready?.zone).toBe('Singapur');
    expect(ready?.chips.map((chip) => chip.time)).toEqual(['16:00']);
  });

  it('names a zone outside the curated list by its city', async () => {
    zone('America/Port_of_Spain');
    const ready = await nextSlots({ status: 'ok', slots: slots(MONDAY) }, 'en');
    expect(ready?.zone).toBe('Port of Spain');
  });

  it('gives nothing for an unavailable calendar or an empty horizon', async () => {
    expect(await nextSlots({ status: 'unavailable' }, 'en')).toBeNull();
    expect(await nextSlots({ status: 'ok', slots: [] }, 'en')).toBeNull();
  });
});
