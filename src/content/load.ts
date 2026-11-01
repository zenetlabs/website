import type {
  AboutPageContent,
  CalculatorPageContent,
  CasePageContent,
  CompanyCopy,
  FaqItem,
  HoldedPairContent,
  HomeContent,
  Metric,
  PricingPageContent,
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import type { Locale } from '@/lib/i18n';
import type { HoldedPageId, ServicePageId } from '@/lib/page-registry';

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

const CALCULATOR = {
  en: () =>
    Promise.all([
      import('@/content/en/calculator'),
      import('@/content/en/services'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/calculator'),
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

const LEGAL_META = {
  en: () => import('@/content/en/legal-meta').then((m) => m.legalMeta),
  es: () => import('@/content/es/legal-meta').then((m) => m.legalMeta),
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

const HOLDED_PAIRS: Record<HoldedPageId, () => Promise<HoldedPairContent>> = {
  holdedPrestashop: () =>
    import('@/content/es/holded-pairs/holded-prestashop').then(
      (m) => m.holdedPrestashop,
    ),
  holdedWoocommerce: () =>
    import('@/content/es/holded-pairs/holded-woocommerce').then(
      (m) => m.holdedWoocommerce,
    ),
  holdedHubspot: () =>
    import('@/content/es/holded-pairs/holded-hubspot').then(
      (m) => m.holdedHubspot,
    ),
};

const VERIFACTU = () =>
  import('@/content/es/verifactu-page').then((m) => m.verifactuPage);

const TRAVEL_AGENCIES = () =>
  import('@/content/es/travel-agencies').then((m) => m.travelAgencies);

const VIATSY_CASE = {
  en: () =>
    Promise.all([
      import('@/content/en/case-pages/viatsy'),
      import('@/content/en/cases'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/case-pages/viatsy'),
      import('@/content/es/cases'),
    ]),
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

export async function loadCalculatorContent(locale: Locale): Promise<{
  copy: CalculatorPageContent;
  services: Services;
}> {
  const [{ calculatorPage }, { services }] = await CALCULATOR[locale]();
  return { copy: calculatorPage, services };
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

async function loadSpanishLanding<T>(copy: () => Promise<T>): Promise<{
  copy: T;
  hub: ServicesHubContent;
  services: Services;
}> {
  const [loaded, [{ servicesHub }, { services }]] = await Promise.all([
    copy(),
    SERVICES_HUB.es(),
  ]);
  return { copy: loaded, hub: servicesHub, services };
}

export function loadHoldedPairContent(page: HoldedPageId) {
  return loadSpanishLanding(HOLDED_PAIRS[page]);
}

export function loadVerifactuContent() {
  return loadSpanishLanding(VERIFACTU);
}

export function loadSectorContent() {
  return loadSpanishLanding(TRAVEL_AGENCIES);
}

export async function loadCaseContent(locale: Locale): Promise<{
  copy: CasePageContent;
  hub: ServicesHubContent;
  metrics: readonly Metric[];
}> {
  const [[{ viatsyCase }, { viatsy }], [{ servicesHub }]] = await Promise.all([
    VIATSY_CASE[locale](),
    SERVICES_HUB[locale](),
  ]);
  return { copy: viatsyCase, hub: servicesHub, metrics: viatsy.metrics };
}

export function loadLegalMeta(locale: Locale) {
  return LEGAL_META[locale]();
}
