import type { LeadError } from '@/lib/lead-result';
import { type LeadRequest, leadRequestSchema } from '@/lib/lead-schema';
import {
  attributionFields,
  CONSENT_VERSION,
  isTestSubmission,
} from '@/server/lead-fields';
import { type NewLead, storeLead } from '@/server/lead-store';
import { deliver, type OutboxDeps } from '@/server/outbox';
import type { Limiter } from '@/server/rate-limit';
import { guardBrowserPost } from '@/server/request';
import { errorName } from '@/server/responses';
import type { SiteConfig } from '../../site.config';

const MAX_BODY_BYTES = 32_768;

export type LeadDeps = OutboxDeps & {
  limiter: Limiter;
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

function newLead(
  input: LeadRequest,
  request: Request,
  site: SiteConfig,
): NewLead {
  return {
    locale: input.locale,
    source: input.source,
    name: input.name,
    email: input.email,
    company: input.company || null,
    message: input.message,
    consent_version: CONSENT_VERSION,
    ...attributionFields(input.attribution, site.url),
    context: null,
    chat_session_id: null,
    is_test: isTestSubmission(new URL(request.url).hostname, input.name)
      ? 1
      : 0,
  };
}

export async function handleLeadPost(
  request: Request,
  deps: LeadDeps,
): Promise<Response> {
  const guarded = await guardBrowserPost({
    request,
    schema: leadRequestSchema,
    action: 'lead',
    label: 'lead',
    limiter: deps.limiter,
    maxBytes: MAX_BODY_BYTES,
    turnstileSecret: deps.turnstileSecret,
    fetch: deps.fetch,
  });
  if (guarded.status === 'honeypot') return respond({ ok: true });
  if (guarded.status === 'rejected') return reject(guarded.error);
  const { input } = guarded;

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
