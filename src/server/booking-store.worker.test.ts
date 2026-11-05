import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { BOOKING_RULES } from '@/content/booking-rules';
import type { Slot } from '@/lib/slots';
import type { Channel } from '@/server/booking-schema';
import {
  activeBookings,
  bookingRow,
  calendarPurgeDue,
  claimCancel,
  confirmHashStatement,
  confirmStatement,
  consumeConfirm,
  expirePendingBookings,
  failStatement,
  findPending,
  finishCancel,
  holdFailure,
  holdPending,
  markEventDeleted,
  queueResend,
  releaseCancel,
  setCancelHash,
  unknownStatement,
} from '@/server/booking-store';
import { emailKey } from '@/server/email-key';
import { leadStatements } from '@/server/lead-store';
import { DAY, NEW_LEAD } from '../../test/leads';

const { DB } = env;
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const HALF_HOUR = 1_800_000;
const HOLD_MS = BOOKING_RULES.confirmMinutes * 60_000;
const LIMITS = {
  perIpDaily: 5,
  perAddressDaily: 3,
  siteDaily: 40,
  resendCooldownSeconds: 60,
};

function slot(day: number, hour: number, minute = 0): Slot {
  const start = Date.UTC(2027, 0, day, hour, minute);
  return {
    start,
    end: start + HALF_HOUR,
    day: `2027-01-${String(day).padStart(2, '0')}`,
  };
}

type NewHold = {
  id: string;
  slot: Slot;
  email: string;
  channel: Channel;
  timeZone: string | null;
  isTest: boolean;
  ipKey: string | null;
};

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
    ipKey: null,
    ...overrides,
  };
}

function caps(
  email: string,
  ipKey: string | null,
  now: number,
  isTest = false,
) {
  return {
    emailKey: emailKey(email),
    dayStart: Math.floor(now / DAY) * DAY,
    ipKey,
    ipDay: new Date(now).toISOString().slice(0, 10),
    isTest,
  };
}

// A pending hold with every cap, as a request makes it.
function holdSlot(
  db: D1Database,
  item: NewHold,
  rules: typeof BOOKING_RULES,
  now: number,
  limits = LIMITS,
) {
  return holdPending(
    db,
    {
      id: item.id,
      verifyId: crypto.randomUUID(),
      slot: item.slot,
      email: item.email,
      channel: item.channel,
      timeZone: item.timeZone,
      isTest: item.isTest,
      request: '{}',
      origin: 'https://zenetlabs.com',
      caps: caps(item.email, item.ipKey, now, item.isTest),
    },
    rules,
    limits,
    now,
  );
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
  await DB.prepare('DELETE FROM booking_ip_usage').run();
});

describe('holdPending', () => {
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
      hold_expires_at: NOW + HOLD_MS,
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
      await holdSlot(
        DB,
        hold(slot(12, 9)),
        BOOKING_RULES,
        NOW + HOLD_MS - 1000,
      ),
    ).toBe('lost');
    const later = NOW + HOLD_MS + 1000;
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
        NOW + HOLD_MS + 1000,
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
    expect(
      await activeBookings(DB, range, false, NOW + HOLD_MS + 1000),
    ).toEqual([]);
  });

  it('says why a hold lost: the address, a full day or the slot', async () => {
    const rules = BOOKING_RULES;
    const failure = async (email: string, day: string, now = NOW + 1000) =>
      (
        await holdFailure(
          DB,
          { email, day, ...caps(email, null, now) },
          rules,
          LIMITS,
          now,
        )
      ).reason;
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

async function count(sql: string): Promise<number> {
  const row = await DB.prepare(sql).first<{ n: number }>();
  return row?.n ?? -1;
}

describe('the email caps in the hold batch', () => {
  it('counts +tag and Gmail-dot variants as one address', async () => {
    const variants = [
      'ada.lovelace@gmail.com',
      'adalovelace+one@googlemail.com',
      'a.d.a.l.o.v.e.l.a.c.e+two@gmail.com',
    ];
    for (const [index, email] of variants.entries()) {
      // Each earlier hold lapses first, so only the email count can refuse.
      const at = NOW + index * (HOLD_MS + 1000);
      expect(
        await holdSlot(
          DB,
          hold(slot(12 + index, 9), { email }),
          BOOKING_RULES,
          at,
        ),
        email,
      ).toBe('won');
    }
    const fourth = NOW + 3 * (HOLD_MS + 1000);
    expect(
      await holdSlot(
        DB,
        hold(slot(15, 9), { email: 'ADA.lovelace+x@gmail.com' }),
        BOOKING_RULES,
        fourth,
      ),
    ).toBe('lost');
    expect(
      await holdFailure(
        DB,
        {
          email: 'ada.lovelace+x@gmail.com',
          day: '2027-01-15',
          ...caps('ada.lovelace+x@gmail.com', null, fourth),
        },
        BOOKING_RULES,
        LIMITS,
        fourth,
      ),
    ).toEqual({ reason: 'limit', cap: 'address' });
  });

  it('caps the site at its daily number of verify emails', async () => {
    const limits = { ...LIMITS, siteDaily: 2 };
    for (const hour of [8, 11]) {
      expect(
        await holdSlot(DB, hold(slot(12, hour)), BOOKING_RULES, NOW, limits),
      ).toBe('won');
    }
    expect(
      await holdSlot(DB, hold(slot(13, 9)), BOOKING_RULES, NOW, limits),
    ).toBe('lost');
    expect(
      await holdSlot(DB, hold(slot(13, 9)), BOOKING_RULES, NOW + DAY, limits),
    ).toBe('won');
  });

  it('counts the IP only when the hold wins, and caps it per day', async () => {
    const ipKey = 'fingerprint';
    const limits = { ...LIMITS, perIpDaily: 2 };
    expect(
      await holdSlot(
        DB,
        hold(slot(12, 8), { ipKey }),
        BOOKING_RULES,
        NOW,
        limits,
      ),
    ).toBe('won');
    expect(
      await holdSlot(
        DB,
        hold(slot(12, 8), { ipKey }),
        BOOKING_RULES,
        NOW,
        limits,
      ),
    ).toBe('lost');
    expect(await count('SELECT sends AS n FROM booking_ip_usage')).toBe(1);
    expect(
      await holdSlot(
        DB,
        hold(slot(12, 11), { ipKey }),
        BOOKING_RULES,
        NOW,
        limits,
      ),
    ).toBe('won');
    expect(
      await holdSlot(
        DB,
        hold(slot(12, 14), { ipKey }),
        BOOKING_RULES,
        NOW,
        limits,
      ),
    ).toBe('lost');
    expect(
      await holdSlot(DB, hold(slot(12, 14)), BOOKING_RULES, NOW, limits),
    ).toBe('won');
    expect(await count('SELECT sends AS n FROM booking_ip_usage')).toBe(2);
  });
});

describe('resend, consume and expiry', () => {
  it('finds the pending request, queues a resend under the caps and drops the older unsent email', async () => {
    const mine = hold(slot(12, 9), { email: 'again@example.com' });
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const found = await findPending(
      DB,
      {
        emailKey: 'again@example.com',
        slotStart: mine.slot.start,
        isTest: false,
      },
      NOW + 1000,
    );
    expect(found).toEqual({
      id: mine.id,
      end: mine.slot.end,
      expiresAt: NOW + HOLD_MS,
      lastVerifyAt: NOW,
    });
    const verifyId = crypto.randomUUID();
    expect(
      await queueResend(
        DB,
        { bookingId: mine.id, verifyId, caps: caps(mine.email, 'ip', NOW) },
        LIMITS,
        NOW + 61_000,
      ),
    ).toBe('queued');
    expect(
      (
        await DB.prepare(
          "SELECT status, last_error FROM booking_emails WHERE kind = 'verify' ORDER BY created_at",
        ).all()
      ).results,
    ).toEqual([
      { status: 'dead', last_error: 'replaced' },
      { status: 'pending', last_error: null },
    ]);
    expect(await count('SELECT sends AS n FROM booking_ip_usage')).toBe(1);
    expect(
      await queueResend(
        DB,
        {
          bookingId: mine.id,
          verifyId: crypto.randomUUID(),
          caps: caps(mine.email, null, NOW),
        },
        LIMITS,
        NOW + HOLD_MS + 1,
      ),
    ).toBe('limit');
  });

  it('refuses a resend inside the cooldown in the same INSERT, so two at once cannot both pass', async () => {
    const mine = hold(slot(12, 9), { email: 'twice@example.com' });
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const at = NOW + 61_000;
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        queueResend(
          DB,
          {
            bookingId: mine.id,
            verifyId: crypto.randomUUID(),
            caps: caps(mine.email, null, at),
          },
          LIMITS,
          at,
        ),
      ),
    );
    expect(results.sort()).toEqual(['cooldown', 'cooldown', 'queued']);
    expect(
      await queueResend(
        DB,
        {
          bookingId: mine.id,
          verifyId: crypto.randomUUID(),
          caps: caps(mine.email, null, at + 30_000),
        },
        LIMITS,
        at + 30_000,
      ),
    ).toBe('cooldown');
  });

  it('keeps test requests out of the live address and site counts', async () => {
    const limits = { ...LIMITS, siteDaily: 1 };
    expect(
      await holdSlot(
        DB,
        hold(slot(12, 9), { isTest: true }),
        BOOKING_RULES,
        NOW,
        limits,
      ),
    ).toBe('won');
    expect(
      await holdSlot(DB, hold(slot(13, 9)), BOOKING_RULES, NOW, limits),
    ).toBe('won');
    expect(
      await holdSlot(DB, hold(slot(14, 9)), BOOKING_RULES, NOW, limits),
    ).toBe('lost');
  });

  it('rotates the confirm hash only while pending, and lets one of two consumes win', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const setHash = async (hash: string, at: number) =>
      (await confirmHashStatement(DB, mine.id, hash, at).run()).meta.changes ===
      1;
    expect(await setHash('a'.repeat(64), NOW)).toBe(true);
    expect(await setHash('b'.repeat(64), NOW)).toBe(true);
    expect(
      await consumeConfirm(
        DB,
        { id: mine.id, hash: 'a'.repeat(64) },
        BOOKING_RULES,
        NOW,
      ),
    ).toBe(false);
    const results = await Promise.all([
      consumeConfirm(
        DB,
        { id: mine.id, hash: 'b'.repeat(64) },
        BOOKING_RULES,
        NOW + 1,
      ),
      consumeConfirm(
        DB,
        { id: mine.id, hash: 'b'.repeat(64) },
        BOOKING_RULES,
        NOW + 1,
      ),
    ]);
    expect(results.sort()).toEqual([false, true]);
    const row = await bookingRow(DB, mine.id);
    expect(row).toMatchObject({
      status: 'held',
      confirmed_at: NOW + 1,
      hold_expires_at: NOW + 1 + BOOKING_RULES.holdSeconds * 1000,
    });
    expect(await setHash('c'.repeat(64), NOW + 2)).toBe(false);
  });

  it('expires lapsed holds lazily and from the cron, nulling the request', async () => {
    const lazy = hold(slot(12, 9));
    const cron = hold(slot(13, 9));
    await holdSlot(DB, lazy, BOOKING_RULES, NOW);
    await holdSlot(DB, cron, BOOKING_RULES, NOW);
    expect(await expirePendingBookings(DB, NOW + HOLD_MS - 1)).toBe(0);
    expect(await expirePendingBookings(DB, NOW + HOLD_MS)).toBe(2);
    expect(
      (await DB.prepare('SELECT status, request FROM bookings').all()).results,
    ).toEqual([
      { status: 'expired', request: null },
      { status: 'expired', request: null },
    ]);
  });
});

describe('the owner cancel', () => {
  async function confirmed(): Promise<{ id: string; leadId: string }> {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'none');
    await DB.batch([
      ...lead.statements,
      confirmStatement(
        DB,
        { id: mine.id, eventId: 'bkx', meetUrl: null },
        lead.leadId,
      ),
    ]);
    return { id: mine.id, leadId: lead.leadId };
  }

  it('claims once, releases on failure, and finishes with the cancelled email', async () => {
    const { id } = await confirmed();
    expect(await setCancelHash(DB, id, 'f'.repeat(64))).toBe(true);
    const claims = await Promise.all([
      claimCancel(DB, id, NOW),
      claimCancel(DB, id, NOW),
    ]);
    expect(claims.sort()).toEqual([false, true]);
    await releaseCancel(DB, id);
    expect((await bookingRow(DB, id))?.cancelled_at).toBeNull();
    expect(await claimCancel(DB, id, NOW + 1)).toBe(true);
    await finishCancel(DB, { id, emailId: 'mail-1' }, NOW + 2);
    expect(await bookingRow(DB, id)).toMatchObject({
      status: 'cancelled',
      cancelled_at: NOW + 1,
      event_deleted_at: NOW + 2,
    });
    expect(
      (
        await DB.prepare(
          "SELECT id FROM booking_emails WHERE kind = 'cancelled'",
        ).all()
      ).results,
    ).toEqual([{ id: 'mail-1' }]);
    expect(await setCancelHash(DB, id, 'e'.repeat(64))).toBe(false);
    expect(
      await activeBookings(DB, { from: NOW, to: NOW + 14 * DAY }, false, NOW),
    ).toEqual([]);
  });
});

describe('the calendar purge selection', () => {
  it('picks confirmed and unknown bookings of leads past the cutoff whose event still exists', async () => {
    const old = hold(slot(12, 9));
    const unknown = hold(slot(13, 9));
    const gone = hold(slot(14, 9));
    const fresh = hold(slot(15, 9));
    for (const item of [old, unknown, gone, fresh]) {
      await holdSlot(DB, item, BOOKING_RULES, NOW);
    }
    const leadAt = (when: number) => leadStatements(DB, NEW_LEAD, when, 'none');
    const [a, b, c, d] = [
      leadAt(NOW - 800 * DAY),
      leadAt(NOW - 800 * DAY),
      leadAt(NOW - 800 * DAY),
      leadAt(NOW),
    ];
    if (!a || !b || !c || !d) throw new Error('leads');
    await DB.batch([
      ...a.statements,
      ...b.statements,
      ...c.statements,
      ...d.statements,
      confirmStatement(
        DB,
        { id: old.id, eventId: 'bk1', meetUrl: null },
        a.leadId,
      ),
      unknownStatement(DB, unknown.id, b.leadId),
      confirmStatement(
        DB,
        { id: gone.id, eventId: 'bk3', meetUrl: null },
        c.leadId,
      ),
      confirmStatement(
        DB,
        { id: fresh.id, eventId: 'bk4', meetUrl: null },
        d.leadId,
      ),
    ]);
    await markEventDeleted(DB, gone.id, NOW);
    const due = await calendarPurgeDue(DB, NOW - 730 * DAY, 50);
    expect(due.map((item) => item.id).sort()).toEqual(
      [old.id, unknown.id].sort(),
    );
    expect(due.find((item) => item.id === unknown.id)?.eventId).toBeNull();
  });
});

describe('the cascade', () => {
  it('deletes the booking and its emails with the lead', async () => {
    const mine = hold(slot(12, 9));
    await holdSlot(DB, mine, BOOKING_RULES, NOW);
    const lead = leadStatements(DB, NEW_LEAD, NOW, 'none');
    await DB.batch([
      ...lead.statements,
      confirmStatement(
        DB,
        { id: mine.id, eventId: 'e', meetUrl: null },
        lead.leadId,
      ),
    ]);
    expect(await count('SELECT count(*) AS n FROM booking_emails')).toBe(1);
    await DB.prepare('DELETE FROM leads WHERE id = ?1').bind(lead.leadId).run();
    expect(await count('SELECT count(*) AS n FROM bookings')).toBe(0);
    expect(await count('SELECT count(*) AS n FROM booking_emails')).toBe(0);
  });
});
