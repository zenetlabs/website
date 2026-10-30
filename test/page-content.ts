import { services as enServices } from '@/content/en/services';
import { services as esServices } from '@/content/es/services';
import type { Currency, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';

export const SERVICES: Record<Locale, Services> = {
  en: enServices,
  es: esServices,
};

export const CURRENCY: Record<Locale, Currency> = { en: 'SGD', es: 'EUR' };
