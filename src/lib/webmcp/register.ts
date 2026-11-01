import type { WebMcpCopy } from '@/content/types';
import { post } from '@/lib/booking-client';
import { BOOKING_LIMITS } from '@/lib/booking-limits';
import { type Locale, localeFromPath } from '@/lib/i18n';
import { isRecord } from '@/lib/is-record';
import { type NavigateDeps, runNavigate } from '@/lib/navigate-client';
import { zonedDay } from '@/lib/slot-format';
import { isTimeZone } from '@/lib/slots';
import { noop, QUARTER_SECOND_MS } from '@/lib/time';
import type { ModelContextLike } from '@/lib/webmcp/boot';
import {
  type BookingProposal,
  hasPendingBooking,
  isEnvelope,
  type MountDialog,
  openConfirmation,
  type ToolEnvelope,
} from '@/lib/webmcp/confirmation';
import type { WebMcpToolName } from '@/lib/webmcp/names';
import {
  type Executors,
  isToolManifest,
  type ToolManifest,
  toWebMcpTools,
  type WebMcpTool,
} from '@/lib/webmcp/tools';

export type RegisterDeps = {
  pathname: () => string;
  browserZone: () => string;
  schedule: NavigateDeps['schedule'];
  assign: NavigateDeps['assign'];
  loadDialog: () => Promise<MountDialog>;
  loadCopy: (locale: Locale) => Promise<WebMcpCopy>;
};

type Execute = WebMcpTool['execute'];
type Issue = { path: string; message: string };

const MAX_SLOT_CHARS = 40;
// What the server's z.iso.datetime({ offset: true }) takes: an explicit Z or offset.
const SLOT_FORMAT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;
const COPY: Record<Locale, () => Promise<WebMcpCopy>> = {
  en: () => import('@/content/en/webmcp').then((m) => m.webmcpCopy),
  es: () => import('@/content/es/webmcp').then((m) => m.webmcpCopy),
};

const NETWORK: ToolEnvelope = { ok: false, error: 'network' };
const BUSY: ToolEnvelope = { ok: false, error: 'busy' };
const UNAVAILABLE: ToolEnvelope = { ok: false, error: 'unavailable' };
const INVALID_SLOT: ToolEnvelope = {
  ok: true,
  result: { status: 'rejected', reason: 'invalid_slot' },
};

function defaultDeps(): RegisterDeps {
  return {
    pathname: () => location.pathname,
    browserZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    // A frame and a short wait after the result is returned: a navigation
    // started sooner can unload the page before the agent has received it.
    schedule: (run) => {
      window.requestAnimationFrame(() => {
        window.setTimeout(run, QUARTER_SECOND_MS);
      });
    },
    assign: (url) => location.assign(url),
    loadDialog: () => import('@/lib/webmcp/mount').then((m) => m.mountDialog),
    loadCopy: (locale) => COPY[locale](),
  };
}

// The browser does not validate an agent's input against the schema.
export function signalOf(options: unknown): AbortSignal | undefined {
  return isRecord(options) && options.signal instanceof AbortSignal
    ? options.signal
    : undefined;
}

async function postTool(
  name: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
): Promise<ToolEnvelope> {
  try {
    const answer = await post(`/api/tools/${name}`, body, signal);
    return isEnvelope(answer) ? answer : NETWORK;
  } catch {
    return NETWORK;
  }
}

export function callTool(
  name: string,
  input: unknown,
  deps: RegisterDeps,
  signal: AbortSignal | undefined,
): Promise<ToolEnvelope> {
  const locale = localeFromPath(deps.pathname());
  return postTool(name, { ...(isRecord(input) ? input : {}), locale }, signal);
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

type Parsed =
  | { ok: true; proposal: BookingProposal; start: number }
  | { ok: false; issues: Issue[] };

// Consent, the challenge token, the honeypot and attribution are never read: only the visitor sets them.
export function parseBookingProposal(
  input: unknown,
  browserZone: string,
): Parsed {
  const raw = isRecord(input) ? input : {};
  const issues: Issue[] = [];
  const slot = typeof raw.slot === 'string' ? raw.slot : '';
  const start =
    slot.length <= MAX_SLOT_CHARS && SLOT_FORMAT.test(slot)
      ? Date.parse(slot)
      : Number.NaN;
  if (Number.isNaN(start)) {
    issues.push({
      path: 'slot',
      message:
        'Expected an ISO date-time with a Z or offset, from check_availability',
    });
  }
  const topic = text(raw.topic, BOOKING_LIMITS.topicMax);
  if (topic.length < BOOKING_LIMITS.topicMin) {
    issues.push({
      path: 'topic',
      message: `Expected ${BOOKING_LIMITS.topicMin} to ${BOOKING_LIMITS.topicMax} characters`,
    });
  }
  if (issues.length > 0) return { ok: false, issues };
  const zone = typeof raw.timeZone === 'string' ? raw.timeZone : '';
  return {
    ok: true,
    start,
    proposal: {
      slot: new Date(start).toISOString(),
      topic,
      name: text(raw.name, BOOKING_LIMITS.name),
      email: text(raw.email, BOOKING_LIMITS.email),
      company: text(raw.company, BOOKING_LIMITS.company),
      timeZone: isTimeZone(zone) ? zone : browserZone,
    },
  };
}

function labelOf(envelope: ToolEnvelope, start: number): string | null {
  if (!envelope.ok || !isRecord(envelope.result)) return null;
  const { slots } = envelope.result;
  if (!Array.isArray(slots)) return null;
  for (const slot of slots) {
    if (
      isRecord(slot) &&
      typeof slot.start === 'string' &&
      typeof slot.label === 'string' &&
      Date.parse(slot.start) === start
    ) {
      return slot.label;
    }
  }
  return null;
}

function isOffering(envelope: ToolEnvelope): boolean {
  return (
    envelope.ok && isRecord(envelope.result) && envelope.result.status === 'ok'
  );
}

// An invented time is turned away before the visitor is asked to confirm it.
export async function proposeBooking(
  input: unknown,
  deps: RegisterDeps,
  signal: AbortSignal | undefined,
): Promise<ToolEnvelope> {
  const parsed = parseBookingProposal(input, deps.browserZone());
  if (!parsed.ok) {
    return { ok: false, error: 'invalid', issues: parsed.issues };
  }
  if (hasPendingBooking()) return BUSY;
  const { proposal, start } = parsed;
  const day = zonedDay(start, proposal.timeZone);
  const offered = await callTool(
    'check_availability',
    { from: day, to: day, timeZone: proposal.timeZone },
    deps,
    signal,
  );
  if (!isOffering(offered)) return offered;
  const label = labelOf(offered, start);
  if (label === null) return INVALID_SLOT;
  const locale = localeFromPath(deps.pathname());
  let mount: MountDialog;
  let copy: WebMcpCopy;
  try {
    [mount, copy] = await Promise.all([
      deps.loadDialog(),
      deps.loadCopy(locale),
    ]);
  } catch {
    return UNAVAILABLE;
  }
  return (
    openConfirmation({
      proposal,
      label,
      locale,
      copy: copy.dialog,
      signal,
      mount,
    }) ?? BUSY
  );
}

function readTool(name: WebMcpToolName, deps: RegisterDeps): Execute {
  return (input, options) => callTool(name, input, deps, signalOf(options));
}

// execute never throws: an agent only sees an opaque error for a rejection.
function guarded(execute: Execute): Execute {
  return async (input, options) => {
    try {
      return await execute(input, options);
    } catch {
      return UNAVAILABLE;
    }
  };
}

export function executorsFor(deps: RegisterDeps): Executors {
  return {
    get_faq: guarded(readTool('get_faq', deps)),
    get_pricing: guarded(readTool('get_pricing', deps)),
    estimate_project: guarded(readTool('estimate_project', deps)),
    check_availability: guarded(readTool('check_availability', deps)),
    book_meeting: guarded((input, options) =>
      proposeBooking(input, deps, signalOf(options)),
    ),
    navigate: guarded(async (input) => runNavigate(input, deps)),
  };
}

async function fetchManifest(): Promise<ToolManifest | null> {
  try {
    const response = await fetch('/api/tools', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isToolManifest(body) ? body : null;
  } catch {
    return null;
  }
}

// A duplicate name or a disabled permissions policy must not stop the other tools.
function register(context: ModelContextLike, tool: WebMcpTool): Promise<void> {
  return Promise.resolve()
    .then(() => context.registerTool(tool))
    .then(noop, noop);
}

export async function registerWebMcp(
  context: ModelContextLike,
  deps: RegisterDeps = defaultDeps(),
): Promise<void> {
  const manifest = await fetchManifest();
  if (manifest === null) return;
  const locale = localeFromPath(deps.pathname());
  let copy: WebMcpCopy;
  try {
    copy = await deps.loadCopy(locale);
  } catch {
    return;
  }
  const tools = toWebMcpTools(manifest, locale, copy, executorsFor(deps));
  await Promise.all(tools.map((tool) => register(context, tool)));
}
