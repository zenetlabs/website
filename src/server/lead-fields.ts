import type { Attribution } from '@/lib/lead-schema';
import { isLiveHost } from '@/lib/redirects';
import { isSingleLine } from '@/lib/single-line';
import type { NewLead } from '@/server/lead-store';

// Bump with the consent sentence or the privacy pages' "last updated" date.
export const CONSENT_VERSION = '2026-11-01';

const PARAM_MAX = 200;
const TEST_NAME = /^\[TEST\]/;

export function isTestSubmission(hostname: string, name: string): boolean {
  return !isLiveHost(hostname) || TEST_NAME.test(name);
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

export type AttributionFields = Pick<
  NewLead,
  | 'utm_source'
  | 'utm_medium'
  | 'utm_campaign'
  | 'utm_term'
  | 'utm_content'
  | 'gclid'
  | 'referrer'
  | 'landing_page'
  | 'submit_page'
>;

export const NO_ATTRIBUTION: AttributionFields = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  gclid: null,
  referrer: null,
  landing_page: null,
  submit_page: null,
};

export function attributionFields(
  attribution: Attribution | null,
  siteUrl: string,
): AttributionFields {
  if (attribution === null) return NO_ATTRIBUTION;
  const params = new URL(attribution.landing, siteUrl).searchParams;
  return {
    utm_source: param(params, 'utm_source'),
    utm_medium: param(params, 'utm_medium'),
    utm_campaign: param(params, 'utm_campaign'),
    utm_term: param(params, 'utm_term'),
    utm_content: param(params, 'utm_content'),
    gclid: param(params, 'gclid'),
    referrer: httpReferrer(attribution.referrer),
    landing_page: attribution.landing || null,
    submit_page: attribution.page,
  };
}
