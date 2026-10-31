import {
  isRelativePath,
  LEAD_ERRORS,
  type LeadError,
  type LeadResult,
} from '@/lib/lead-result';
import type { LeadRequest } from '@/lib/lead-schema';

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

function relative(path: string, max: number): string {
  return isRelativePath(path) ? path.slice(0, max) : '';
}

export function attribution(): LeadRequest['attribution'] {
  let landing = location.pathname + location.search;
  const [navigation] = performance.getEntriesByType('navigation');
  if (navigation) {
    try {
      const url = new URL(navigation.name);
      landing = url.pathname + url.search;
    } catch {
      // Keep the current location.
    }
  }
  return {
    landing: relative(landing, 2048),
    referrer: document.referrer.slice(0, 2048),
    page: relative(location.pathname, 512) || '/',
  };
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
