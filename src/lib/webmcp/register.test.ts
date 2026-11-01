import { afterEach, describe, expect, it, vi } from 'vitest';
import { webmcpCopy as en } from '@/content/en/webmcp';
import { webmcpCopy as es } from '@/content/es/webmcp';
import { isRecord } from '@/lib/is-record';
import type { BookingRequest, MountDialog } from '@/lib/webmcp/confirmation';
import {
  callTool,
  executorsFor,
  parseBookingProposal,
  proposeBooking,
  type RegisterDeps,
  registerWebMcp,
  signalOf,
} from '@/lib/webmcp/register';
import type { WebMcpTool } from '@/lib/webmcp/tools';
import { manifest } from '@/server/tools/registry';

const FLAGS = {
  calculator: { published: true },
  booking: { published: true },
};
// Tuesday 5 January 2027, 09:00 UTC.
const SLOT = '2027-01-05T09:00:00.000Z';
const LABEL = 'Tuesday 5 January, 10:00 am';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Route = (url: string, body: unknown) => Response | Promise<Response>;

const COPY = { en, es };
const mounted: BookingRequest[] = [];

function deps(route: Route, pathname = '/') {
  const calls: Array<{ url: string; body: unknown; init: RequestInit }> = [];
  const assign = vi.fn();
  const tasks: Array<() => void> = [];
  const mount: MountDialog = (request) => {
    mounted.push(request);
    return () => undefined;
  };
  const loadDialog = vi.fn(() => Promise.resolve(mount));
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (input, init = {}) => {
      const url = String(input);
      const body: unknown =
        typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({ url, body, init });
      return route(url, body);
    }),
  );
  const value: RegisterDeps = {
    pathname: () => pathname,
    browserZone: () => 'Europe/Madrid',
    schedule: (run) => {
      tasks.push(run);
    },
    assign,
    loadDialog,
    loadCopy: (locale) => Promise.resolve(COPY[locale]),
  };
  return { value, calls, assign, tasks, loadDialog };
}

function offered(
  slots: unknown[] = [{ start: SLOT, end: SLOT, label: LABEL }],
) {
  return json({ ok: true, result: { status: 'ok', slots, more: false } });
}

function bookingRoute(slots?: unknown[]): Route {
  return (url) =>
    url === '/api/tools/check_availability'
      ? offered(slots)
      : json({ ok: true });
}

function pendingRequest(): BookingRequest | null {
  return mounted.at(-1) ?? null;
}

afterEach(() => {
  mounted.at(-1)?.dismiss();
  mounted.length = 0;
  vi.unstubAllGlobals();
});

describe('registerWebMcp', () => {
  function context() {
    const tools: WebMcpTool[] = [];
    return {
      tools,
      registerTool: vi.fn((tool: WebMcpTool) => {
        tools.push(tool);
        return Promise.resolve();
      }),
    };
  }

  it('registers nothing and does not throw when the manifest fails', async () => {
    for (const route of [
      () => json({ ok: false }, 500),
      () => new Response('not json', { status: 200 }),
      () => json({ version: 9, tools: [] }),
    ]) {
      const target = context();
      await registerWebMcp(target, deps(route).value);
      expect(target.registerTool).not.toHaveBeenCalled();
    }
    const target = context();
    const broken = deps(() => json({}));
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    await registerWebMcp(target, broken.value);
    expect(target.registerTool).not.toHaveBeenCalled();
  });

  it('registers the six tools, in the page language, from the manifest', async () => {
    const target = context();
    const run = deps(() => json(manifest(FLAGS)), '/es/precios');
    await registerWebMcp(target, run.value);
    expect(target.tools.map((tool) => tool.name)).toEqual([
      'get_faq',
      'get_pricing',
      'estimate_project',
      'check_availability',
      'book_meeting',
      'navigate',
    ]);
    expect(target.tools[0]?.title).toBe('Buscar en las preguntas frecuentes');
    expect(run.calls.map((call) => call.url)).toEqual(['/api/tools']);
  });

  it('keeps registering when one call rejects or throws', async () => {
    const seen: string[] = [];
    const target = {
      registerTool: vi.fn((tool: WebMcpTool) => {
        seen.push(tool.name);
        if (tool.name === 'get_faq') return Promise.reject(new Error('dup'));
        if (tool.name === 'get_pricing') throw new Error('sync');
        return undefined;
      }),
    };
    await registerWebMcp(target, deps(() => json(manifest(FLAGS))).value);
    expect(seen).toHaveLength(6);
  });
});

describe('callTool', () => {
  it('posts the page locale over whatever the agent sent', async () => {
    const run = deps(
      () => json({ ok: true, result: { currency: 'EUR' } }),
      '/es',
    );
    const envelope = await callTool(
      'get_pricing',
      { locale: 'en', service: 'web' },
      run.value,
      undefined,
    );
    expect(envelope).toEqual({ ok: true, result: { currency: 'EUR' } });
    const [call] = run.calls;
    expect(call?.url).toBe('/api/tools/get_pricing');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
    expect(call?.body).toEqual({ locale: 'es', service: 'web' });
  });

  it('passes the server envelopes through unchanged', async () => {
    const limited = { ok: false, error: 'rate' };
    expect(
      await callTool(
        'get_faq',
        {},
        deps(() => json(limited, 429)).value,
        undefined,
      ),
    ).toEqual(limited);
    const invalid = {
      ok: false,
      error: 'invalid',
      issues: [{ path: ['query'], message: 'Required' }],
    };
    expect(
      await callTool(
        'get_faq',
        {},
        deps(() => json(invalid, 400)).value,
        undefined,
      ),
    ).toEqual(invalid);
  });

  it('reports a network error or a non-envelope body as network', async () => {
    const down = deps(() => json({}));
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    expect(await callTool('get_faq', {}, down.value, undefined)).toEqual({
      ok: false,
      error: 'network',
    });
    expect(
      await callTool(
        'get_faq',
        {},
        deps(() => new Response('<html>')).value,
        undefined,
      ),
    ).toEqual({ ok: false, error: 'network' });
    expect(
      await callTool('get_faq', {}, deps(() => json([1])).value, undefined),
    ).toEqual({ ok: false, error: 'network' });
  });

  it('wraps a non-object input without throwing', async () => {
    const run = deps(() => json({ ok: true, result: 1 }));
    await callTool('get_pricing', 'oops', run.value, undefined);
    expect(run.calls[0]?.body).toEqual({ locale: 'en' });
  });
});

describe('parseBookingProposal', () => {
  it('requires a slot and a topic', () => {
    for (const input of [
      undefined,
      {},
      { slot: SLOT },
      { topic: 'Automate our inbox triage' },
      { slot: 'tomorrow', topic: 'Automate our inbox triage' },
      { slot: '2027-01-05T09:00:00', topic: 'Automate our inbox triage' },
      { slot: '2027-01-05 09:00:00Z', topic: 'Automate our inbox triage' },
      { slot: '2027-01-05', topic: 'Automate our inbox triage' },
      { slot: 7, topic: 'Automate our inbox triage' },
      { slot: `${SLOT}${' '.repeat(40)}`, topic: 'Automate our inbox triage' },
      { slot: SLOT, topic: 'short' },
    ]) {
      expect(parseBookingProposal(input, 'Europe/Madrid').ok).toBe(false);
    }
  });

  it('ignores what only the visitor may set', () => {
    const parsed = parseBookingProposal(
      {
        slot: '2027-01-05T10:00:00+01:00',
        topic: 'Automate our inbox triage',
        consent: true,
        turnstileToken: 'x',
        website: 'y',
        attribution: { page: '/' },
        timeZone: 'Asia/Tokyo',
      },
      'Europe/Madrid',
    );
    expect(parsed).toMatchObject({
      ok: true,
      proposal: { slot: SLOT, timeZone: 'Asia/Tokyo' },
    });
    expect(parsed.ok && Object.keys(parsed.proposal).sort()).toEqual([
      'company',
      'email',
      'name',
      'slot',
      'timeZone',
      'topic',
    ]);
  });

  it('clips optional fields and falls back to the browser zone', () => {
    const parsed = parseBookingProposal(
      {
        slot: SLOT,
        topic: 'Automate our inbox triage',
        name: 'n'.repeat(500),
        email: 'e'.repeat(500),
        company: 'c'.repeat(500),
        timeZone: 'Not/AZone',
      },
      'Europe/Madrid',
    );
    expect(parsed.ok && parsed.proposal.name).toHaveLength(100);
    expect(parsed.ok && parsed.proposal.email).toHaveLength(254);
    expect(parsed.ok && parsed.proposal.company).toHaveLength(100);
    expect(parsed.ok && parsed.proposal.timeZone).toBe('Europe/Madrid');
  });
});

describe('proposeBooking', () => {
  const input = { slot: SLOT, topic: 'Automate our inbox triage' };

  it('rejects a missing slot or topic without any request', async () => {
    const run = deps(bookingRoute());
    const envelope = await proposeBooking({ slot: SLOT }, run.value, undefined);
    expect(envelope).toMatchObject({ ok: false, error: 'invalid' });
    expect(run.calls).toHaveLength(0);
  });

  it('asks for the slot day in the proposal zone before opening anything', async () => {
    const run = deps(bookingRoute());
    const pending = proposeBooking(
      { ...input, timeZone: 'Asia/Tokyo' },
      run.value,
      undefined,
    );
    await vi.waitFor(() => expect(pendingRequest()).not.toBeNull());
    expect(run.calls[0]?.url).toBe('/api/tools/check_availability');
    expect(run.calls[0]?.body).toEqual({
      from: '2027-01-05',
      to: '2027-01-05',
      timeZone: 'Asia/Tokyo',
      locale: 'en',
    });
    pendingRequest()?.dismiss();
    await expect(pending).resolves.toEqual({
      ok: true,
      result: { status: 'declined' },
    });
  });

  it('opens the confirmation with the checked label, the proposal and no visitor-only fields', async () => {
    const run = deps(bookingRoute(), '/es');
    const pending = proposeBooking(
      {
        ...input,
        name: 'Ada',
        consent: true,
        turnstileToken: 'x',
        website: 'y',
        attribution: {},
      },
      run.value,
      undefined,
    );
    await vi.waitFor(() => expect(pendingRequest()).not.toBeNull());
    const request = pendingRequest();
    expect(request?.label).toBe(LABEL);
    expect(request?.locale).toBe('es');
    expect(request?.copy.title).toBe(es.dialog.title);
    expect(request?.proposal).toEqual({
      slot: SLOT,
      topic: input.topic,
      name: 'Ada',
      email: '',
      company: '',
      timeZone: 'Europe/Madrid',
    });
    expect(run.loadDialog).toHaveBeenCalledOnce();
    request?.begin();
    request?.finish({ ok: true, result: { status: 'booked' } }, true);
    request?.dismiss();
    await expect(pending).resolves.toEqual({
      ok: true,
      result: { status: 'booked' },
    });
  });

  it('returns a time that was not offered as rejected, with no dialog', async () => {
    const run = deps(bookingRoute([]));
    await expect(proposeBooking(input, run.value, undefined)).resolves.toEqual({
      ok: true,
      result: { status: 'rejected', reason: 'invalid_slot' },
    });
    expect(pendingRequest()).toBeNull();
    expect(run.loadDialog).not.toHaveBeenCalled();
  });

  it('returns an unavailable calendar as it is, with no dialog', async () => {
    const unavailable = {
      ok: true,
      result: { status: 'unavailable', reason: 'not_configured' },
    };
    const run = deps(() => json(unavailable));
    await expect(proposeBooking(input, run.value, undefined)).resolves.toEqual(
      unavailable,
    );
    expect(pendingRequest()).toBeNull();
  });

  it('answers busy while a confirmation is open', async () => {
    const run = deps(bookingRoute());
    const first = proposeBooking(input, run.value, undefined);
    await vi.waitFor(() => expect(pendingRequest()).not.toBeNull());
    const requests = run.calls.length;
    await expect(proposeBooking(input, run.value, undefined)).resolves.toEqual({
      ok: false,
      error: 'busy',
    });
    expect(run.calls).toHaveLength(requests);
    pendingRequest()?.dismiss();
    await first;
  });

  it('answers unavailable when the dialog chunk cannot load', async () => {
    const run = deps(bookingRoute());
    run.loadDialog.mockRejectedValueOnce(new Error('chunk gone'));
    await expect(proposeBooking(input, run.value, undefined)).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
    expect(pendingRequest()).toBeNull();
  });
});

describe('executorsFor', () => {
  it('never throws, even when a dependency does', async () => {
    const run = deps(() => json({}));
    run.value.pathname = () => {
      throw new Error('boom');
    };
    const executors = executorsFor(run.value);
    await expect(executors.navigate({ page: 'pricing' })).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
    await expect(executors.get_faq({})).resolves.toEqual({
      ok: false,
      error: 'unavailable',
    });
  });

  it('routes navigate through the allow-list and the scheduler', async () => {
    const run = deps(() => json({}), '/');
    const envelope = await executorsFor(run.value).navigate({
      page: 'pricing',
    });
    expect(envelope).toEqual({ ok: true, result: { url: '/pricing' } });
    expect(run.assign).not.toHaveBeenCalled();
    run.tasks[0]?.();
    expect(run.assign).toHaveBeenCalledWith('/pricing');
  });
});

describe('signalOf', () => {
  it('reads the signal of the current spec and nothing else', () => {
    const controller = new AbortController();
    expect(signalOf({ signal: controller.signal })).toBe(controller.signal);
    expect(
      signalOf({ requestUserInteraction: () => undefined }),
    ).toBeUndefined();
    expect(signalOf(undefined)).toBeUndefined();
    expect(signalOf({ signal: 'x' })).toBeUndefined();
    expect(isRecord(signalOf({}))).toBe(false);
  });
});
