import type {
  AboutPageContent,
  CompanyCopy,
  FaqItem,
  HomeContent,
  PricingPageContent,
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import type { Locale } from '@/lib/i18n';
import type { ServicePageId } from '@/lib/page-registry';

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
      import('@/content/en/services-hub'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/pricing'),
      import('@/content/es/services'),
      import('@/content/es/services-hub'),
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

const SERVICE_PAGES: Record<
  ServicePageId,
  Record<Locale, () => Promise<ServicePageContent>>
> = {
  automation: {
    en: () =>
      import('@/content/en/service-pages/automation').then((m) => m.automation),
    es: () =>
      import('@/content/es/service-pages/automation').then((m) => m.automation),
  },
  integrations: {
    en: () =>
      import('@/content/en/service-pages/integrations').then(
        (m) => m.integrations,
      ),
    es: () =>
      import('@/content/es/service-pages/integrations').then(
        (m) => m.integrations,
      ),
  },
  agents: {
    en: () => import('@/content/en/service-pages/agents').then((m) => m.agents),
    es: () => import('@/content/es/service-pages/agents').then((m) => m.agents),
  },
  software: {
    en: () =>
      import('@/content/en/service-pages/software').then((m) => m.software),
    es: () =>
      import('@/content/es/service-pages/software').then((m) => m.software),
  },
  training: {
    en: () =>
      import('@/content/en/service-pages/training').then((m) => m.training),
    es: () =>
      import('@/content/es/service-pages/training').then((m) => m.training),
  },
};

const SERVICES_HUB = {
  en: () =>
    Promise.all([
      import('@/content/en/services-hub'),
      import('@/content/en/services'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/services-hub'),
      import('@/content/es/services'),
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
  hub: ServicesHubContent;
}> {
  const [{ pricingPage }, { services }, { servicesHub }] =
    await PRICING[locale]();
  return { page: pricingPage, services, hub: servicesHub };
}

export async function loadAboutContent(locale: Locale): Promise<{
  page: AboutPageContent;
  companies: CompanyCopy;
}> {
  const [{ aboutPage }, { companies }] = await ABOUT[locale]();
  return { page: aboutPage, companies };
}

export async function loadServicePageContent(
  locale: Locale,
  page: ServicePageId,
): Promise<{
  copy: ServicePageContent;
  hub: ServicesHubContent;
  services: Services;
}> {
  const [copy, [{ servicesHub }, { services }]] = await Promise.all([
    SERVICE_PAGES[page][locale](),
    SERVICES_HUB[locale](),
  ]);
  return { copy, hub: servicesHub, services };
}

export async function loadServicesHubContent(locale: Locale): Promise<{
  hub: ServicesHubContent;
  services: Services;
}> {
  const [{ servicesHub }, { services }] = await SERVICES_HUB[locale]();
  return { hub: servicesHub, services };
}
