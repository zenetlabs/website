export const LEAD_ERRORS = [
  'origin',
  'unsupported',
  'rate',
  'too-large',
  'invalid',
  'captcha',
  'unavailable',
] as const;

export type LeadError = (typeof LEAD_ERRORS)[number];

export type LeadResult = { ok: true } | { ok: false; error: LeadError };

export const ATTRIBUTION_LIMITS = {
  landing: 2048,
  referrer: 2048,
  page: 512,
} as const;

export function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !/^\/[/\\]/.test(path);
}
