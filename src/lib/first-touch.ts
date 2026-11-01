import { ATTRIBUTION_LIMITS, isRelativePath } from '@/lib/lead-result';
import {
  getItem,
  parseJsonObject,
  removeItem,
  setItem,
} from '@/lib/local-store';
import { isSingleLine } from '@/lib/single-line';
import { currentVisit, type Visit } from '@/lib/visit';

export const FIRST_TOUCH_KEY = 'zenet-first-touch';
export const FIRST_TOUCH_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export type FirstTouch = { landing: string; referrer: string; at: number };

function parseFirstTouch(raw: string): FirstTouch | null {
  const value = parseJsonObject(raw);
  if (
    value !== null &&
    'landing' in value &&
    typeof value.landing === 'string' &&
    (value.landing === '' || isRelativePath(value.landing)) &&
    value.landing.length <= ATTRIBUTION_LIMITS.landing &&
    isSingleLine(value.landing) &&
    'referrer' in value &&
    typeof value.referrer === 'string' &&
    value.referrer.length <= ATTRIBUTION_LIMITS.referrer &&
    isSingleLine(value.referrer) &&
    'at' in value &&
    typeof value.at === 'number' &&
    Number.isFinite(value.at)
  ) {
    return {
      landing: value.landing,
      referrer: value.referrer,
      at: value.at,
    };
  }
  return null;
}

export function readFirstTouch(now: number): FirstTouch | null {
  const raw = getItem(FIRST_TOUCH_KEY);
  if (raw === null) return null;
  const touch = parseFirstTouch(raw);
  if (touch === null || now - touch.at > FIRST_TOUCH_MAX_AGE_MS) {
    removeItem(FIRST_TOUCH_KEY);
    return null;
  }
  return touch;
}

export function clearFirstTouch(): void {
  removeItem(FIRST_TOUCH_KEY);
}

function isEntry(referrer: string, origin: string): boolean {
  if (referrer === '') return true;
  try {
    return new URL(referrer).origin !== origin;
  } catch {
    return true;
  }
}

export function captureFirstTouch(
  now: number,
  visit: Visit = currentVisit(),
  origin: string = location.origin,
): void {
  if (!isEntry(visit.referrer, origin)) return;
  if (readFirstTouch(now) !== null) return;
  const touch: FirstTouch = {
    landing: visit.landing,
    referrer: visit.referrer,
    at: now,
  };
  setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
}
