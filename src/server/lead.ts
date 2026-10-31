import type { LeadError } from '@/lib/lead-result';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';
import { isLiveHost } from '@/lib/redirects';
import { isSingleLine } from '@/lib/single-line';
import { type NewLead, storeLead } from '@/server/lead-store';
import { deliver, type OutboxDeps } from '@/server/outbox';
import { errorName } from '@/server/responses';
import { verifyTurnstile } from '@/server/turnstile';
import type { SiteConfig } from '../../site.config';

// Bump with the consent sentence or the privacy pages' "last updated" date.
export const CONSENT_VERSION = '2026-10-31';

const MAX_BODY_BYTES = 32_768;
const PARAM_MAX = 200;
const TEST_NAME = /^\[TEST\]/;
const JSON_TYPE = /^application\/json(?:\s*;|$)/i;

export type LeadDeps = OutboxDeps & {
  limiter: { limit(options: { key: string }): Promise<{ success: boolean }> };
  turnstileSecret: () => Promise<string>;
  waitUntil: (promise: Promise<unknown>) => void;
  now: () => number;
};

const STATUS = {
  origin: 403,
  unsupported: 415,
  rate: 429,
  'too-large': 413,
  invalid: 400,
  captcha: 403,
  unavailable: 503,
} as const satisfies Record<LeadError, number>;

function respond(body: { ok: true } | { ok: false; error: LeadError }) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (!body.ok && body.error === 'rate') headers.set('Retry-After', '60');
  return Response.json(body, {
    status: body.ok ? 200 : STATUS[body.error],
    headers,
  });
}

function reject(error: LeadError): Response {
  return respond({ ok: false, error });
}

async function readCapped(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function param(params: URLSearchParams, name: string): string | null {
  const value = params.get(name)?.trim();
  return value && value.length <= PARAM_MAX && isSingleLine(value)
    ? value
    : null;
}

function httpReferrer(referrer: string): string | null {
  try {
    const { protocol, href } = new URL(referrer);
    return protocol === 'http:' || protocol === 'https:' ? href : null;
  } catch {
    return null;
  }
}

function newLead(
  input: LeadRequest,
  request: Request,
  site: SiteConfig,
): NewLead {
  const { attribution } = input;
  const params = new URL(attribution.landing, site.url).searchParams;
  return {
    locale: input.locale,
    source: input.source,
    name: input.name,
    email: input.email,
    company: input.company || null,
    message: input.message,
    consent_version: CONSENT_VERSION,
    utm_source: param(params, 'utm_source'),
    utm_medium: param(params, 'utm_medium'),
    utm_campaign: param(params, 'utm_campaign'),
    utm_term: param(params, 'utm_term'),
    utm_content: param(params, 'utm_content'),
    gclid: param(params, 'gclid'),
    referrer: httpReferrer(attribution.referrer),
    landing_page: attribution.landing || null,
    submit_page: attribution.page,
    context: null,
    chat_session_id: null,
    is_test:
      !isLiveHost(new URL(request.url).hostname) || TEST_NAME.test(input.name)
        ? 1
        : 0,
  };
}

export async function handleLeadPost(
  request: Request,
  deps: LeadDeps,
): Promise<Response> {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return reject('origin');
  }
  if (!JSON_TYPE.test(request.headers.get('content-type') ?? '')) {
    return reject('unsupported');
  }
  const ip = request.headers.get('cf-connecting-ip');
  const limited = await new Promise<{ success: boolean }>((resolve) =>
    resolve(deps.limiter.limit({ key: ip ?? 'unknown' })),
  ).then(
    ({ success }) => !success,
    () => {
      console.error('lead: limiter unavailable');
      return false;
    },
  );
  if (limited) return reject('rate');
  const secret = new Promise<string>((resolve) =>
    resolve(deps.turnstileSecret()),
  ).then(
    (value) => ({ value }),
    () => null,
  );
  const text = await readCapped(request);
  if (text === null) return reject('too-large');
  const parsed = leadRequestSchema.safeParse(parseJson(text));
  if (!parsed.success) return reject('invalid');
  const input = parsed.data;
  if (input.website !== '') return respond({ ok: true });

  const turnstileSecret = await secret;
  if (turnstileSecret === null) {
    console.error('lead: secret unavailable');
    return reject('unavailable');
  }
  const human = await verifyTurnstile({
    token: input.turnstileToken,
    action: 'lead',
    secret: turnstileSecret.value,
    remoteIp: ip,
    fetch: deps.fetch,
  });
  if (!human) return reject('captcha');

  const now = deps.now();
  let emails: Awaited<ReturnType<typeof storeLead>>;
  try {
    emails = await storeLead(deps.db, newLead(input, request, deps.site), now);
  } catch (error) {
    console.error('lead: store failed', { error: errorName(error) });
    return reject('unavailable');
  }
  deps.waitUntil(
    deliver(deps, emails, now).catch((error) => {
      console.error('lead-email: delivery failed', { error: errorName(error) });
    }),
  );
  return respond({ ok: true });
}
