import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookMeeting, clearBusyCache, confirmFromLink } from '@/server/booking';
import {
  type CancelDeps,
  cancelPage,
  postCancel,
} from '@/server/booking-cancel';
import { clearTokenCache } from '@/server/google-auth';
import {
  bookingDeps,
  newWorld,
  signingCredentials,
  type World,
} from '../../test/google';

const { DB } = env;
const ORIGIN = 'https://zenetlabs.com';
const NOW = Date.UTC(2027, 0, 4, 8, 0);
const SLOT = Date.UTC(2027, 0, 12, 9, 0);

let world: World;
let background: Promise<unknown>[];
let secret: string;

function deps(now = NOW + 120_000): CancelDeps {
  return {
    ...bookingDeps(DB, world, secret, background),
    limiter: { limit: async () => ({ success: true }) },
    now: () => now,
  };
}

async function settle() {
  await Promise.allSettled(background);
}

// A confirmed booking, and the cancel link from the owner's email.
async function confirmed(): Promise<string> {
  await bookMeeting(
    {
      input: {
        slot: new Date(SLOT).toISOString(),
        name: 'Ada <b>Lovelace</b>',
        email: 'ada@example.com',
        company: 'Analytical Engines',
        topic: 'Automate our inbox triage.',
        timeZone: 'Asia/Singapore',
        locale: 'es',
      },
      channel: 'chat',
      surface: 'chat',
      consentAt: NOW,
      attribution: null,
      chatSessionId: null,
      origin: ORIGIN,
      ip: null,
    },
    { deps: deps(), now: NOW, isTest: false },
  );
  await settle();
  const token = /\?confirm=([\w.-]+)/.exec(world.sent.at(-1)?.text ?? '')?.[1];
  expect(
    await confirmFromLink(token, { deps: deps(), now: NOW + 60_000 }),
  ).toBe('confirmed');
  await settle();
  const owner = world.sent.find((mail) => mail.to === 'owner@example.com');
  const link = /Cancel this booking: (\S+)/.exec(owner?.text ?? '')?.[1] ?? '';
  return new URL(link).searchParams.get('t') ?? '';
}

function page(token: string): Request {
  return new Request(`${ORIGIN}/api/book/cancel?t=${token}`);
}

function post(token: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/book/cancel`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: `t=${token}`,
  });
}

beforeEach(async () => {
  world = newWorld(NOW);
  background = [];
  secret = JSON.stringify((await signingCredentials()).credentials);
  clearTokenCache();
  clearBusyCache();
  await DB.prepare('DELETE FROM bookings').run();
  await DB.prepare('DELETE FROM leads').run();
});

describe('the owner cancel page', () => {
  it('shows the booking, escaped, with one button, sends noindex and no-store, and changes nothing', async () => {
    const token = await confirmed();
    const response = await cancelPage(page(token), deps());
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('same-origin');
    expect(response.headers.get('content-security-policy')).toContain(
      "form-action 'self'",
    );
    const html = await response.text();
    expect(html).toContain('Cancel this call?');
    expect(html).toContain('Ada &lt;b&gt;Lovelace&lt;/b&gt;');
    expect(html).toContain('Analytical Engines');
    expect(html).toContain('Channel</dt><dd>chat');
    expect(html).toContain('Cancel the call and email the visitor');
    expect(world.deletes).toEqual([]);
    expect(await DB.prepare('SELECT status FROM bookings').first()).toEqual({
      status: 'confirmed',
    });
  });

  it('answers 404 for a wrong or malformed token', async () => {
    const token = await confirmed();
    const [id] = token.split('.');
    for (const wrong of [`${id}.${'A'.repeat(43)}`, 'nope', '']) {
      expect((await cancelPage(page(wrong), deps())).status).toBe(404);
      expect((await postCancel(post(wrong), deps())).status).toBe(404);
    }
  });

  it('cancels on POST: deletes with sendUpdates=all, marks the row and emails the visitor', async () => {
    const token = await confirmed();
    world.sent = [];
    const response = await postCancel(post(token), deps());
    await settle();
    expect(await response.text()).toContain(
      'Cancelled. The event is deleted, Google has sent its cancellation and we&#39;ve emailed ada@example.com.',
    );
    expect(world.deletes).toEqual([
      {
        calendarId: 'main-calendar',
        eventId: expect.stringMatching(/^bk[0-9a-f]{32}$/),
        sendUpdates: 'all',
      },
    ]);
    expect(world.events).toEqual([]);
    expect(
      await DB.prepare(
        'SELECT status, cancelled_at, event_deleted_at FROM bookings',
      ).first(),
    ).toEqual({
      status: 'cancelled',
      cancelled_at: NOW + 120_000,
      event_deleted_at: NOW + 120_000,
    });
    expect(world.sent.map((mail) => [mail.to, mail.subject])).toEqual([
      [
        'ada@example.com',
        'Cancelada: tu llamada con Zenet Labs, martes 12 de enero, 17:00',
      ],
    ]);
    expect(world.sent[0]?.text).toContain(`${ORIGIN}/es/reservar`);
    expect(world.sent[0]?.text).not.toContain('Lovelace');
  });

  it('says already cancelled on a second POST and on the page, with no button', async () => {
    const token = await confirmed();
    await postCancel(post(token), deps());
    await settle();
    const again = await (await postCancel(post(token), deps())).text();
    expect(again).toContain('Already cancelled.');
    expect(again).not.toContain('<button');
    expect(await (await cancelPage(page(token), deps())).text()).toContain(
      'Already cancelled.',
    );
    expect(world.deletes).toHaveLength(1);
  });

  it('reverts the claim and says nothing changed when Google fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const token = await confirmed();
    world.deleteStatus = 500;
    world.sent = [];
    const text = await (await postCancel(post(token), deps())).text();
    expect(text).toContain(
      'Google didn&#39;t delete the event, so nothing changed.',
    );
    expect(text).toContain('<button');
    expect(
      await DB.prepare('SELECT status, cancelled_at FROM bookings').first(),
    ).toEqual({ status: 'confirmed', cancelled_at: null });
    expect(world.sent).toEqual([]);
    world.deleteStatus = 204;
    expect(await (await postCancel(post(token), deps())).text()).toContain(
      'Cancelled.',
    );
    log.mockRestore();
  });

  it('treats a 410 from Google as already deleted', async () => {
    const token = await confirmed();
    world.deleteStatus = 410;
    expect(await (await postCancel(post(token), deps())).text()).toContain(
      'Cancelled.',
    );
  });

  it('refuses a call that already happened', async () => {
    const token = await confirmed();
    const after = deps(SLOT + 3_600_000);
    expect(await (await cancelPage(page(token), after)).text()).toContain(
      'This call has already happened.',
    );
    expect(await (await postCancel(post(token), after)).text()).toContain(
      'This call has already happened.',
    );
    expect(world.deletes).toEqual([]);
  });

  it('refuses a POST from another origin', async () => {
    const token = await confirmed();
    const response = await postCancel(
      post(token, { Origin: 'https://evil.example' }),
      deps(),
    );
    expect(response.status).toBe(403);
    expect(world.deletes).toEqual([]);
  });

  it('keeps the link working when the owner email is sent again', async () => {
    const first = await confirmed();
    await DB.prepare(
      "UPDATE email_outbox SET status = 'failed', attempts = 1 WHERE kind = 'owner'",
    ).run();
    const { deliverDue } = await import('@/server/outbox');
    world.sent = [];
    await deliverDue(deps(), NOW + 3_600_000);
    const owner = world.sent.find((mail) => mail.to === 'owner@example.com');
    const second = new URL(
      /Cancel this booking: (\S+)/.exec(owner?.text ?? '')?.[1] ?? 'https://x',
    ).searchParams.get('t');
    expect(second).toBe(first);
    expect((await cancelPage(page(first), deps())).status).toBe(200);
  });

  it('shows a busy note while another cancel holds the claim, and takes over a stale one', async () => {
    const token = await confirmed();
    await DB.prepare('UPDATE bookings SET cancelled_at = ?1')
      .bind(NOW + 110_000)
      .run();
    const busy = await (await postCancel(post(token), deps())).text();
    expect(busy).toContain('Another cancel of this call is running right now.');
    expect(world.deletes).toEqual([]);
    const later = await (
      await postCancel(post(token), deps(NOW + 200_000))
    ).text();
    expect(later).toContain('Cancelled.');
  });
});
