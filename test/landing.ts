import { viatsy as enViatsy } from '@/content/en/cases';
import { viatsy as esViatsy } from '@/content/es/cases';
import type { Metric } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { SERVICE_BODIES } from './service-bodies';

const { spanish } = SERVICE_BODIES.es.landing;
if (!spanish) throw new Error('The Spanish landing content did not load');

export const SPANISH = spanish;
export const HUB_ES = SERVICE_BODIES.es.hub;
export const HUB = { en: SERVICE_BODIES.en.hub, es: SERVICE_BODIES.es.hub };
export const VIATSY = {
  en: SERVICE_BODIES.en.landing.viatsy,
  es: SERVICE_BODIES.es.landing.viatsy,
};
export const METRICS: Record<Locale, readonly Metric[]> = {
  en: enViatsy.metrics,
  es: esViatsy.metrics,
};
