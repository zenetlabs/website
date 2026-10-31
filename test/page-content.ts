import { pricingPage as enPricing } from '@/content/en/pricing';
import { services as enServices } from '@/content/en/services';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { services as esServices } from '@/content/es/services';
import type { Currency, PricingPageContent, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';

export const SERVICES: Record<Locale, Services> = {
  en: enServices,
  es: esServices,
};

export const CURRENCY: Record<Locale, Currency> = { en: 'SGD', es: 'EUR' };

export const PRICING_PAGE: Record<Locale, PricingPageContent> = {
  en: enPricing,
  es: esPricing,
};
