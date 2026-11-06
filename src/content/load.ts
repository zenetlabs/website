import type {
  AboutPageContent,
  BookingConfirmCopy,
  BookPageContent,
  CalculatorPageContent,
  CasePageContent,
  CasesHubContent,
  ChatCopy,
  CompanyCopy,
  ContactPageContent,
  FaqItem,
  HoldedPairContent,
  HomeContent,
  Metric,
  PricingPageContent,
  ServicePageContent,
  Services,
  ServicesHubContent,
  VoiceCopy,
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
      import('@/content/en/faq'),
    ]),
  es: () =>
    Promise.all([
      import('@/content/es/pricing'),
      import('@/content/es/services'),
      import('@/content/es/services-hub'),
      import('@/content/es/faq'),
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

const BOOK = {
  en: () =>
    Promise.all([import('@/content/en/book'), import('@/content/en/services')]),
  es: () =>
    Promise.all([import('@/content/es/book'), import('@/content/es/services')]),
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

const CONTACT = {
  en: () => import('@/content/en/contact').then((m) => m.contactPage),
  es: () => import('@/content/es/contact').then((m) => m.contactPage),
};

const CASES_HUB = {
  en: () => import('@/content/en/cases-hub').then((m) => m.casesHub),
  es: () => import('@/content/es/cases-hub').then((m) => m.casesHub),
};

const LEGAL_META = {
  en: () => import('@/content/en/legal-meta').then((m) => m.legalMeta),
  es: () => import('@/content/es/legal-meta').then((m) => m.legalMeta),
};

const SERVICE_PAGES: Record<
  ServicePageId,
  Record<Locale, () => Promise<ServicePageContent>>
> = {
  diagnostic: {
    en: () =>
      import('@/content/en/service-pages/diagnostic').then((m) => m.diagnostic),
    es: () =>
      import('@/content/es/service-pages/diagnostic').then((m) => m.diagnostic),
  },
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
  maintenance: {
    en: () =>
      import('@/content/en/service-pages/maintenance').then(
        (m) => m.maintenance,
      ),
    es: () =>
      import('@/content/es/service-pages/maintenance').then(
        (m) => m.maintenance,
      ),
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

// While voice is dark the call-to-action copy must not reach the page, not even
// in the data a route hands to the client.
function withoutVoice(home: HomeContent): HomeContent {
  const { voice: _voice, ...contact } = home.contact;
  const { call: _deskCall, ...desk } = home.desk;
  const { call: _doorCall, ...doors } = home.doors;
  return { ...home, contact, desk, doors };
}

export async function loadHomeContent(locale: Locale): Promise<{
  home: HomeContent;
  faq: readonly FaqItem[];
  services: Services;
}> {
  const [{ home }, { faq }, { services }] = await HOME[locale]();
  return { home: __VOICE__ ? home : withoutVoice(home), faq, services };
}

export async function loadPricingContent(locale: Locale): Promise<{
  page: PricingPageContent;
  services: Services;
  hub: ServicesHubContent;
  faq: readonly FaqItem[];
}> {
  const [{ pricingPage }, { services }, { servicesHub }, { faq }] =
    await PRICING[locale]();
  return {
    page: pricingPage,
    services,
    hub: servicesHub,
    faq: faq.filter((item) => item.group === 'terms'),
  };
}

export async function loadCalculatorContent(locale: Locale): Promise<{
  copy: CalculatorPageContent;
  services: Services;
}> {
  const [{ calculatorPage }, { services }] = await CALCULATOR[locale]();
  return { copy: calculatorPage, services };
}

export async function loadBookContent(locale: Locale): Promise<{
  copy: BookPageContent;
  services: Services;
}> {
  const [{ bookPage }, { services }] = await BOOK[locale]();
  return { copy: bookPage, services };
}

const BOOK_CONFIRM = {
  en: () => import('@/content/en/book-confirm'),
  es: () => import('@/content/es/book-confirm'),
};

export async function loadBookConfirmCopy(
  locale: Locale,
): Promise<BookingConfirmCopy> {
  return (await BOOK_CONFIRM[locale]()).bookConfirm;
}

export async function loadAboutContent(locale: Locale): Promise<{
  page: AboutPageContent;
  companies: CompanyCopy;
}> {
  const [{ aboutPage }, { companies }] = await ABOUT[locale]();
  return { page: aboutPage, companies };
}

export async function loadContactContent(
  locale: Locale,
): Promise<ContactPageContent> {
  const page = await CONTACT[locale]();
  if (__VOICE__) return page;
  const { voice: _voice, ...form } = page.form;
  return { ...page, form };
}

export function loadCasesHubContent(locale: Locale): Promise<CasesHubContent> {
  return CASES_HUB[locale]();
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

const CHAT = {
  en: () => import('@/content/en/chat').then((m) => m.chatCopy),
  es: () => import('@/content/es/chat').then((m) => m.chatCopy),
};

export function loadChatCopy(locale: Locale): Promise<ChatCopy> {
  return CHAT[locale]();
}

const VOICE = {
  en: () => import('@/content/en/voice').then((m) => m.voiceCopy),
  es: () => import('@/content/es/voice').then((m) => m.voiceCopy),
};

export function loadVoiceCopy(locale: Locale): Promise<VoiceCopy> {
  return VOICE[locale]();
}
