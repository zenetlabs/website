import { useSyncExternalStore } from 'react';
import {
  getItem,
  parseJsonObject,
  removeItem,
  setItem,
} from '@/lib/local-store';

export const CONSENT_KEY = 'zenet-consent';
export const COOKIE_CONSENT_REVISION = 1;
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export type ConsentChoice = { analytics: boolean; marketing: boolean };
export type ConsentRecord = ConsentChoice & { revision: number; at: number };

export const ACCEPT_ALL: ConsentChoice = { analytics: true, marketing: true };
export const REJECT_ALL: ConsentChoice = { analytics: false, marketing: false };

export function parseConsent(raw: string): ConsentRecord | null {
  const value = parseJsonObject(raw);
  if (
    value !== null &&
    'analytics' in value &&
    typeof value.analytics === 'boolean' &&
    'marketing' in value &&
    typeof value.marketing === 'boolean' &&
    'revision' in value &&
    value.revision === COOKIE_CONSENT_REVISION &&
    'at' in value &&
    typeof value.at === 'number' &&
    Number.isFinite(value.at)
  ) {
    return {
      analytics: value.analytics,
      marketing: value.marketing,
      revision: value.revision,
      at: value.at,
    };
  }
  return null;
}

let cachedRaw: string | null | undefined;
let cachedRecord: ConsentRecord | null = null;

export function readConsent(): ConsentRecord | null {
  const raw = getItem(CONSENT_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRecord = raw === null ? null : parseConsent(raw);
  }
  return cachedRecord;
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function saveConsent(choice: ConsentChoice, now: number): ConsentRecord {
  const record: ConsentRecord = {
    analytics: choice.analytics,
    marketing: choice.marketing,
    revision: COOKIE_CONSENT_REVISION,
    at: now,
  };
  setItem(CONSENT_KEY, JSON.stringify(record));
  notify();
  return record;
}

export function pruneConsent(now: number): void {
  const record = readConsent();
  const stale =
    record === null
      ? getItem(CONSENT_KEY) !== null
      : now - record.at > CONSENT_MAX_AGE_MS;
  if (!stale) return;
  removeItem(CONSENT_KEY);
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useConsent(): ConsentRecord | null | undefined {
  return useSyncExternalStore(subscribe, readConsent, () => undefined);
}
