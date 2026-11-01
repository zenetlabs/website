import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '@/content/booking-rules';
import type { Slot } from '@/lib/slots';
import {
  activeBookings,
  confirmStatement,
  failStatement,
  holdFailure,
  holdSlot,
  type NewHold,
  unknownStatement,
} from '@/server/booking-store';
import { leadStatements } from '@/server/lead-store';
import { DAY, NEW_LEAD } from '../../test/leads';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const HALF_HOUR = 1_800_000;

function slot(day: number, hour: number, minute = 0): Slot {
  const start = Date.UTC(2027, 0, day, hour, minute);
  return {
    start,
    end: start + HALF_HOUR,
    day: `2027-01-${String(day).padStart(2, '0')}`,
  };
}

let counter = 0;
function hold(at: Slot, overrides: Partial<NewHold> = {}): NewHold {
  counter += 1;
  return {
    id: `booking-${counter}`,
    slot: at,
    email: `person-${counter}@example.com`,
    channel: 'web',
    timeZone: 'Asia/Singapore',
    isTest: false,
    ...overrides,
  };
}

async function status(id: string): Promise<string | null> {
  const row = await DB.prepare('SELECT status FROM bookings WHERE id = ?1')
    .bind(id)
    .first<{ status: string }>();
  return row?.status ?? null;
}

beforeEach(async () => {
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

describe('holdSlot', () => {
  it('holds a free slot for the configured time', async () => {
    const mine = hold(slot(12, 9));
    expect(await holdSlot(DB, mine, BOOKING_RULES, NOW)).toBe('won');
    const row = await DB.prepare(
      'SELECT status, hold_expires_at, day, channel, time_zone FROM bookings WHERE id = ?1',
    )
      .bind(mine.id)
      .first();
    expect(row).toEqual({
      status: 'held',
      hold_expires_at: NOW + 120_000,
      day: '2027-01-12',
      channel: 'web',
      time_zone: 'Asia/Singapore',
    });
  });

  it('lets exactly one of two concurrent holds on one slot win', async () => {
    const at = slot(12, 9);
    const results = await Promise.all([
      holdSlot(DB, hold(at), BOOKING_RULES, NOW),
      holdSlot(DB, hold(at), BOOKING_RULES, NOW),
      holdSlot(DB, hold(at), BOOKING_RULES, NOW),
    ]);
    expect(results.filter((result) => result === 'won')).toHaveLength(1);
    expect(results.filter((result) => result === 'lost')).toHaveLength(2);
  });

  it('lets exactly one of two concurrent holds on adjacent slots win', async () => {
    const results = await Promise.all([
      holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, NOW),
      holdSlot(DB, hold(slot(12, 9, 30)), BOOKING_RULES, NOW),
    ]);
    expect(results.filter((result) => result === 'won')).toHaveLength(1);
  });

  it('refuses a slot inside the 15 minute buffer and allows one outside it', async () => {
    expect(await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, NOW)).toBe(
      'won',
    );
    expect(await holdSlot(DB, hold(slot(12, 9, 30)), BOOKING_RULES, NOW)).toBe(
      'lost',
    );
    expect(await holdSlot(DB, hold(slot(12, 10)), BOOKING_RULES, NOW)).toBe(
      'won',
    );
  });

  it('refuses the fourth booking of a day', async () => {
    for (const hour of [8, 11, 14]) {
      expect(await holdSlot(DB, hold(slot(12, hour)), BOOKING_RULES, NOW)).toBe(
        'won',
      );
    }
    expect(await holdSlot(DB, hold(slot(12, 16)), BOOKING_RULES, NOW)).toBe(
      'lost',
    );
    expect(await holdSlot(DB, hold(slot(13, 16)), BOOKING_RULES, NOW)).toBe(
      'won',
    );
  });

  it('allows one booking per address in 24 hours, and another after that', async () => {
    const email = 'same@example.com';
    expect(
      await holdSlot(DB, hold(slot(12, 9), { email }), BOOKING_RULES, NOW),
    ).toBe('won');
    await DB.prepare(
      "UPDATE bookings SET status = 'confirmed', hold_expires_at = NULL WHERE email = ?1",
    )
      .bind(email)
      .run();
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email }),
        BOOKING_RULES,
        NOW + DAY - 1,
      ),
    ).toBe('lost');
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email }),
        BOOKING_RULES,
        NOW + DAY + 1,
      ),
    ).toBe('won');
  });

  it('frees a slot whose hold has expired', async () => {
    const first = hold(slot(12, 9));
    expect(await holdSlot(DB, first, BOOKING_RULES, NOW)).toBe('won');
    expect(
      await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, NOW + 119_000),
    ).toBe('lost');
    const later = NOW + 121_000;
    expect(await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, later)).toBe(
      'won',
    );
    expect(await status(first.id)).toBe('expired');
  });

  it('keeps test and real bookings apart', async () => {
    const at = slot(12, 9);
    expect(
      await holdSlot(DB, hold(at, { isTest: true }), BOOKING_RULES, NOW),
    ).toBe('won');
    expect(await holdSlot(DB, hold(at), BOOKING_RULES, NOW)).toBe('won');
    const email = 'both@example.com';
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email, isTest: true }),
        BOOKING_RULES,
        NOW,
      ),
    ).toBe('won');
    expect(
      await holdSlot(DB, hold(slot(14, 9), { email }), BOOKING_RULES, NOW),
    ).toBe('won');
  });

  it('maps a unique-index violation to a lost hold and rethrows other errors', async () => {
    const failing = (message: string) =>
      new Proxy(DB, {
        get(target, property) {
          if (property === 'batch') {
            return async () => {
              throw new Error(message);
            };
          }
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    const at = hold(slot(12, 9));
    expect(
      await holdSlot(
        failing('D1_ERROR: UNIQUE constraint failed: bookings.slot_start'),
        at,
        BOOKING_RULES,
        NOW,
      ),
    ).toBe('lost');
    await expect(
      holdSlot(failing('D1_ERROR: network lost'), at, BOOKING_RULES, NOW),
    ).rejects.toThrow('network lost');
  });
});

describe('an unconfirmed hold', () => {
  it('stops counting against the address once it expires', async () => {
    const email = 'abandoned@example.com';
    await holdSlot(DB, hold(slot(12, 9), { email }), BOOKING_RULES, NOW);
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email }),
        BOOKING_RULES,
        NOW + 60_000,
      ),
    ).toBe('lost');
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email }),
        BOOKING_RULES,
        NOW + 121_000,
      ),
    ).toBe('won');
  });
});

describe('activeBookings and the address cap', () => {
  it('lists confirmed and live holds in range for one bucket', async () => {
    const live = hold(slot(12, 9));
    const other = hold(slot(12, 11), { isTest: true });
    const outside = hold(slot(20, 9));
    for (const item of [live, other, outside]) {
      await holdSlot(DB, item, BOOKING_RULES, NOW);
    }
    const range = { from: NOW, to: Date.UTC(2027, 0, 18) };
    expect(await activeBookings(DB, range, false, NOW)).toEqual([slot(12, 9)]);
    expect(await activeBookings(DB, range, true, NOW)).toEqual([slot(12, 11)]);
    expect(await activeBookings(DB, range, false, NOW + 121_000)).toEqual([]);
  });

  it('says why a hold lost: the address, a full day or the slot', async () => {
    const rules = BOOKING_RULES;
    const failure = (email: string, day: string, now = NOW + 1000) =>
      holdFailure(DB, { email, isTest: false, day }, rules, now);
    const mine = 'recent@example.com';
    await holdSlot(DB, hold(slot(12, 9), { email: mine }), rules, NOW);
    expect(await failure(mine, '2027-01-12')).toBe('limit');
    expect(await failure('other@example.com', '2027-01-12')).toBe('slot_taken');
    for (const hour of [11, 14]) {
      await holdSlot(DB, hold(slot(12, hour)), rules, NOW);
    }
    expect(await failure('other@example.com', '2027-01-12')).toBe('day_full');
    expect(await failure('other@example.com', '2027-01-13')).toBe('slot_taken');
    expect(await failure(mine, '2027-01-12', NOW + DAY + 1)).toBe('slot_taken');
  });
});

describe('the unknown outcome', () => {
  it('keeps the slot, the day and the address blocked until the owner decides', async () => {
    const mine = hold(slot(12, 9), { email: 'unsure@example.com' });
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'none');
    await DB.batch([
      ...lead.statements,
      unknownStatement(DB, mine.id, lead.leadId),
    ]);
    expect(await status(mine.id)).toBe('unknown');
    const later = NOW + 10 * 60_000;
    expect(await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, later)).toBe(
      'lost',
    );
    expect(
      await holdSlot(
        DB,
        hold(slot(13, 9), { email: 'unsure@example.com' }),
        BOOKING_RULES,
        later,
      ),
    ).toBe('lost');
    expect(
      await activeBookings(DB, { from: NOW, to: NOW + 14 * DAY }, false, later),
    ).toEqual([slot(12, 9)]);
    await DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?1")
      .bind(mine.id)
      .run();
    expect(await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, later)).toBe(
      'won',
    );
  });

  it('only moves a hold that is still held', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    await DB.prepare("UPDATE bookings SET status = 'expired' WHERE id = ?1")
      .bind(mine.id)
      .run();
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'always');
    const results = await DB.batch([
      ...lead.statements,
      confirmStatement(
        DB,
        { id: mine.id, eventId: 'e', meetUrl: null },
        lead.leadId,
      ),
    ]);
    expect(results.at(-1)?.meta.changes).toBe(0);
    expect(await status(mine.id)).toBe('expired');
  });
});

describe('confirm and fail statements', () => {
  it('confirms a hold with the event, the link and the lead in one batch', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'always');
    await DB.batch([
      ...lead.statements,
      confirmStatement(
        DB,
        { id: mine.id, eventId: 'bkabc', meetUrl: 'https://meet.google.com/x' },
        lead.leadId,
      ),
    ]);
    const row = await DB.prepare(
      'SELECT status, event_id, meet_url, lead_id, hold_expires_at FROM bookings WHERE id = ?1',
    )
      .bind(mine.id)
      .first();
    expect(row).toEqual({
      status: 'confirmed',
      event_id: 'bkabc',
      meet_url: 'https://meet.google.com/x',
      lead_id: lead.leadId,
      hold_expires_at: null,
    });
    expect(
      await activeBookings(
        DB,
        { from: NOW, to: NOW + 14 * DAY },
        false,
        NOW + DAY,
      ),
    ).toHaveLength(1);
  });

  it('marks a failed hold and frees its slot', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'none');
    await DB.batch([
      ...lead.statements,
      failStatement(DB, mine.id, lead.leadId),
    ]);
    expect(await status(mine.id)).toBe('failed');
    expect(await holdSlot(DB, hold(slot(12, 9)), BOOKING_RULES, NOW)).toBe(
      'won',
    );
  });

  it('deletes a booking with its lead (cascade)', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'always');
    await DB.batch([
      ...lead.statements,
      confirmStatement(
        DB,
        { id: mine.id, eventId: 'e', meetUrl: null },
        lead.leadId,
      ),
    ]);
    await DB.prepare('DELETE FROM leads WHERE id = ?1').bind(lead.leadId).run();
    expect(await status(mine.id)).toBeNull();
  });
});
