import {
  LEAD_ERRORS,
  type LeadError,
  type LeadResult,
} from '@/lib/lead-result';
import type { LeadRequest } from '@/lib/lead-schema';
import { currentVisit } from '@/lib/visit';

const UNAVAILABLE: LeadResult = { ok: false, error: 'unavailable' };
const RATE_LIMITED: LeadResult = { ok: false, error: 'rate' };

function isLeadError(value: unknown): value is LeadError {
  return LEAD_ERRORS.some((error) => error === value);
}

export function isLeadResult(value: unknown): value is LeadResult {
  if (typeof value !== 'object' || value === null || !('ok' in value)) {
    return false;
  }
  if (value.ok === true) return true;
  return value.ok === false && 'error' in value && isLeadError(value.error);
}

export async function attribution(
  now = Date.now(),
): Promise<LeadRequest['attribution']> {
  const visit = currentVisit();
  if (__GA4_ID__ === null) return visit;
  try {
    const [{ readConsent }, { readFirstTouch }] = await Promise.all([
      import('@/lib/consent'),
      import('@/lib/first-touch'),
    ]);
    if (!readConsent()?.marketing) return visit;
    const touch = readFirstTouch(now);
    return touch
      ? { ...visit, landing: touch.landing, referrer: touch.referrer }
      : visit;
  } catch {
    // A chunk that fails to load must never cost us the lead.
    return visit;
  }
}

export async function submitLead(input: LeadRequest): Promise<LeadResult> {
  try {
    const response = await fetch('/api/lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
    });
    const json = response.headers
      .get('content-type')
      ?.includes('application/json');
    if (response.status === 429 && !json) return RATE_LIMITED;
    if (!json) return UNAVAILABLE;
    const body: unknown = await response.json().catch(() => undefined);
    return isLeadResult(body) ? body : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}
