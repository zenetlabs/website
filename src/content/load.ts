import type {
  AboutPageContent,
  CompanyCopy,
  FaqItem,
  HomeContent,
  PricingPageContent,
  Services,
} from '@/content/types';
import type { Locale } from '@/lib/i18n';

const HOME = {
  en: () =>
    Promise.all([
      import('@/content/en/home'),
      import('@/content/en/faq'),
      import('@/content/en/services'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/home'),
      import('@/content/es/faq'),
      import('@/content/es/services'),
    ]),
};

const PRICING = {
  en: () =>
    Promise.all([
      import('@/content/en/pricing'),
      import('@/content/en/services'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/pricing'),
      import('@/content/es/services'),
    ]),
};

const ABOUT = {
  en: () =>
    Promise.all([
      import('@/content/en/about'),
      import('@/content/en/companies'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/about'),
      import('@/content/es/companies'),
    ]),
};

export async function loadHomeContent(locale: Locale): Promise<{
  home: HomeContent;
  faq: readonly FaqItem[];
  services: Services;
}> {
  const [{ home }, { faq }, { services }] = await HOME[locale]();
  return { home, faq, services };
}

export async function loadPricingContent(locale: Locale): Promise<{
  page: PricingPageContent;
  services: Services;
}> {
  const [{ pricingPage }, { services }] = await PRICING[locale]();
  return { page: pricingPage, services };
}

export async function loadAboutContent(locale: Locale): Promise<{
  page: AboutPageContent;
  companies: CompanyCopy;
}> {
  const [{ aboutPage }, { companies }] = await ABOUT[locale]();
  return { page: aboutPage, companies };
}
