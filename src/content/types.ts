import type { BookingZone } from '@/content/booking-rules';
import type {
  ProjectType,
  ToolId,
  Urgency,
  Volume,
} from '@/lib/calculator-answers';
import type { LandingPageId, PageId, ServicePageId } from '@/lib/page-registry';
import type { PortfolioKey } from '@/lib/portfolio';

export type Currency = 'SGD' | 'EUR';
export type Country = 'SG' | 'ES';

export type PostalAddress = {
  streetAddress: string;
  postalCode: string;
  locality: string;
  region?: string;
  country: Country;
};

export type SpanishLegalClauses = {
  controller: string;
  holder: string;
  consentBasis: string;
  transferPlaces: string;
  authorities: string;
  governingLaw: string;
};

export type LegalEntity = {
  kind: 'company' | 'sole-trader';
  legalName: string;
  taxId: { scheme: 'UEN' | 'NIF'; value: string };
  address: PostalAddress | null;
  foundingYear?: string;
  founder?: string;
  jsonLd: {
    type: 'Organization' | 'ProfessionalService';
    idPath: `/${string}`;
    urlPath: `/${string}`;
  };
};

export type PublishedEntity = LegalEntity & { address: PostalAddress };

export type PageMeta = {
  title: string;
  metaTitle: string;
  description: string;
};

export type TitleParts = { before: string; emphasis: string; after: string };
export type RichPart = string | { text: string; href: string };
export type Rich = readonly RichPart[];

export type ServiceId =
  | 'diagnostic'
  | 'integration'
  | 'agent'
  | 'web'
  | 'training'
  | 'maintenance'
  | 'growth';

export type Price = {
  id: string;
  label?: string;
  note?: string;
  min: number;
  max?: number;
  qualifier?: 'from';
  unit: 'one-off' | 'month';
  currency: Currency;
};

export type Service = {
  id: ServiceId;
  name: string;
  summary: string;
  prices: readonly [Price, ...Price[]];
};
export type Services = Record<ServiceId, Service>;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type Metric = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
};
export type PageLink = { page: PageId; label: string };

export type CaseStudy = {
  id: 'viatsy' | 'taplany';
  name: string;
  tag: string;
  context: string;
  automated: readonly string[];
  metrics: readonly Metric[];
  link?: PageLink;
};

export type Photo = { src: `/${string}`; width: number; height: number };
export type Founder = {
  name: string;
  role: string;
  bio: Rich;
  photo: Photo | null;
  sameAs: readonly string[];
};

export type CompanyCopy = Record<
  PortfolioKey,
  { category: string; description: string }
>;

export type SectionCopy = { eyebrow: string; title: TitleParts; lead?: string };

export type HomeContent = {
  hero: {
    eyebrow: string;
    title: TitleParts;
    lead: string;
    primary: string;
    secondary: string;
    audience: string;
  };
  runlog: { title: string; description: string; lines: readonly string[] };
  companies: { title: string; items: CompanyCopy };
  problems: SectionCopy & {
    fixLabel: string;
    items: readonly {
      id: 'orders' | 'invoices' | 'customers';
      title: string;
      problem: string;
      fix: string;
    }[];
  };
  verifactu?: {
    eyebrow: string;
    title: TitleParts;
    paragraphs: readonly string[];
    cta: string;
    checked: string;
  };
  services: SectionCopy & { more: string; calculator: string };
  process: SectionCopy & {
    steps: readonly {
      id: 'diagnose' | 'pilot' | 'scale' | 'maintain';
      label: string;
      text: string;
    }[];
  };
  cases: SectionCopy & {
    automatedLabel: string;
    items: readonly CaseStudy[];
  };
  founder: SectionCopy & { more: string };
  faq: SectionCopy;
  contact: SectionCopy & { mail: string; human: string; book: string };
};

export type PricingPageContent = {
  meta: PageMeta;
  catalog: string;
  eyebrow: string;
  title: TitleParts;
  lead: string;
  taxNote: string;
  labels: { price: string; includes: string; timeline: string; more: string };
  details: Record<
    ServiceId,
    { includes: readonly string[]; timeline?: string }
  >;
  how: { title: string; items: readonly string[] };
  calculator: { title: string; text: string; link: string };
  cta: { title: string; text: string; button: string; faq: string };
};

export type AboutPageContent = {
  meta: PageMeta;
  eyebrow: string;
  title: TitleParts;
  lead: string;
  story: readonly { id: string; parts: Rich }[];
  principles: {
    title: string;
    items: readonly { id: string; title: string; text: string }[];
  };
  companies: { title: string; lead: string };
  vision: { title: string; text: string };
  cta: { title: string; text: string; button: string };
};

export type ProcessStep = { id: string; label: string; text: string };
export type ProcessCopy = SectionCopy & { steps: readonly ProcessStep[] };

export type PageHero = { eyebrow: string; title: TitleParts; lead: string };
export type PageFacts = { who: string; timeline: string; start: string };
export type PageCta = { title: string; text: string; button: string };
export type Card = { id: string; title: string; text: string };

export type ServicePageContent = {
  meta: Pick<PageMeta, 'metaTitle' | 'description'>;
  hero: PageHero;
  facts: PageFacts;
  cta: PageCta;
  useCases: SectionCopy & {
    items: readonly (Card & { page?: PageId })[];
  };
  how: ProcessCopy & {
    steps: readonly [ProcessStep, ProcessStep, ProcessStep, ProcessStep];
  };
  case: SectionCopy & {
    text: string;
    points: readonly string[];
    page?: PageId;
  };
  faq: SectionCopy & { items: readonly FaqItem[] };
  related: readonly [ServicePageId, ServicePageId];
};

export type LandingMeta = Pick<PageMeta, 'metaTitle' | 'description'>;

export type SyncRow = {
  id: string;
  data: string;
  direction: string;
  when: string;
};

export type SyncColumns = { data: string; direction: string; when: string };

export type HoldedPairContent = {
  meta: LandingMeta;
  hero: PageHero;
  facts: PageFacts;
  cta: PageCta;
  sync: SectionCopy & {
    columns: SyncColumns;
    rows: readonly SyncRow[];
    note: string;
  };
  edgeCases: SectionCopy & { items: readonly Card[] };
  faq: SectionCopy & { items: readonly FaqItem[] };
  related: readonly PageId[];
};

export type VerifactuPageContent = {
  meta: LandingMeta;
  hero: PageHero;
  facts: PageFacts;
  cta: PageCta;
  deadlines: SectionCopy & {
    columns: { who: string; date: string };
    rows: readonly { id: 'companies' | 'others'; who: string; date: string }[];
    announced: string;
    producers: string;
    exclusionsTitle: string;
    exclusions: readonly string[];
    checked: string;
  };
  requirements: SectionCopy & { items: readonly Card[] };
  work: SectionCopy & { items: readonly Card[]; limits: string };
  disclaimer: string;
  faq: SectionCopy & { items: readonly FaqItem[] };
  related: readonly PageId[];
};

export type SectorPageContent = {
  meta: LandingMeta;
  hero: PageHero;
  facts: PageFacts;
  cta: PageCta;
  work: SectionCopy & {
    todayLabel: string;
    automatedLabel: string;
    items: readonly {
      id: string;
      title: string;
      today: string;
      automated: string;
    }[];
  };
  platform: { title: string; text: string; link: string };
  case: SectionCopy & { text: string };
  faq: SectionCopy & { items: readonly FaqItem[] };
  related: readonly PageId[];
};

export type LandingContentMap = {
  holdedPrestashop: HoldedPairContent;
  holdedWoocommerce: HoldedPairContent;
  holdedHubspot: HoldedPairContent;
  verifactu: VerifactuPageContent;
  travelAgencies: SectorPageContent;
};

export type CaseFact = { id: string; label: string; value: string };
export type CaseStep = { id: string; label: string; text: string };

export type CasePageContent = {
  meta: LandingMeta;
  eyebrow: string;
  title: TitleParts;
  lead: string;
  published: string;
  labels: { published: string; updated: string };
  facts: readonly CaseFact[];
  problem: SectionCopy & { paragraphs: readonly string[] };
  built: SectionCopy & { items: readonly Card[] };
  operations: SectionCopy & {
    steps: readonly [CaseStep, CaseStep, CaseStep, CaseStep];
  };
  results: SectionCopy & { points: readonly string[] };
  cta: PageCta;
  related: readonly PageId[];
};

export type ServicePageLabels = {
  breadcrumb: string;
  who: string;
  price: string;
  timeline: string;
  start: string;
  taxNote: string;
  pricing: string;
  mail: string;
  related: string;
  allServices: string;
};

export type ServicesHubContent = {
  labels: ServicePageLabels;
  meta: PageMeta;
  eyebrow: string;
  title: TitleParts;
  lead: string;
  cards: Record<ServicePageId, { name: string; summary: string }>;
  landing: Partial<Record<LandingPageId | 'viatsyCase', string>>;
  also: { title: string; lead: string };
  start: { title: string; text: string; button: string };
  pricing: string;
};

export type LlmsCopy = {
  operator: string;
  markdown: string;
  fullNote: string;
  headings: Record<
    | 'services'
    | 'pages'
    | 'faq'
    | 'portfolio'
    | 'contact'
    | 'pricing'
    | 'problems'
    | 'process'
    | 'cases'
    | 'about'
    | 'servicePages'
    | 'holded',
    string
  >;
  labels: Record<'email' | 'form' | 'full' | 'index' | 'otherLanguage', string>;
};

export type SiteContent = {
  entity: LegalEntity;
  countryNames: Record<Country, string>;
  founder: Founder;
};

export type ConsentCopy = {
  title: string;
  text: string;
  policy: string;
  reject: string;
  accept: string;
  settings: string;
  dialog: {
    title: string;
    intro: string;
    necessary: string;
    necessaryText: string;
    alwaysOn: string;
    analytics: string;
    analyticsText: string;
    marketing: string;
    marketingText: string;
    save: string;
    close: string;
  };
};

export type Range = readonly [low: number, high: number];
export type ProjectComponent = Extract<
  ServiceId,
  'integration' | 'agent' | 'web'
>;

export type PricingRules = {
  version: string;
  shared: {
    volumePercent: Record<Volume, number>;
    urgency: Record<Urgency, { pricePercent: number; weeksPercent: number }>;
    addOnWeeksPercent: number;
    components: Record<
      ProjectComponent,
      {
        includedTools: number;
        weeks: Range;
        weeksPerTool: Range;
        weeksPerCustom: Range;
      }
    >;
    maintenance: { standardFromTools: number; standardFromVolume: Volume };
  };
  markets: Record<
    Currency,
    {
      step: number;
      components: Record<
        ProjectComponent,
        { spread: number; perTool: Range; perCustom: Range; cap?: number }
      >;
    }
  >;
};

export type CalculatorOption = { label: string; hint?: string };

export type CalculatorPageContent = {
  meta: PageMeta;
  breadcrumb: { label: string; pricing: string };
  eyebrow: string;
  title: TitleParts;
  lead: string;
  disclaimer: { title: string; text: string };
  taxNote: string;
  privacy: string;
  pricingLink: string;
  submit: string;
  questions: {
    type: { legend: string; options: Record<ProjectType, CalculatorOption> };
    tools: {
      legend: string;
      hint: string;
      options: Record<ToolId, CalculatorOption>;
    };
    volume: { legend: string; options: Record<Volume, CalculatorOption> };
    extras: {
      legend: string;
      hint: string;
      options: Record<'agent' | 'web', CalculatorOption>;
    };
    urgency: { legend: string; options: Record<Urgency, CalculatorOption> };
    maintenance: {
      legend: string;
      options: Record<'yes' | 'no', CalculatorOption>;
    };
  };
  result: {
    title: string;
    empty: string;
    short: string;
    labels: {
      total: string;
      timeline: string;
      maintenance: string;
      diagnostic: string;
      answers: string;
    };
    weeks: string;
    weeksSingle: string;
    breakdown: string;
    tools: { none: string; one: string; many: string };
    custom: string;
    addOn: string;
    capped: string;
    volume: string;
    urgency: string;
    noChange: string;
    percent: string;
    rounding: string;
    cappedNote: string;
    maintenanceWanted: string;
    maintenanceNotWanted: string;
    diagnosticText: string;
    share: string;
    change: string;
  };
  contact: {
    title: TitleParts;
    lead: string;
    intro: string;
    page: string;
    mail: string;
  };
};

export type BookPageContent = {
  meta: PageMeta;
  breadcrumb: { label: string };
  eyebrow: string;
  title: TitleParts;
  lead: string;
  facts: readonly {
    id: 'duration' | 'where' | 'cost' | 'next';
    label: string;
    value: string;
  }[];
  zone: {
    label: string;
    show: string;
    legend: string;
    zones: Record<BookingZone, string>;
  };
  picker: {
    legend: string;
    times: { one: string; other: string };
    required: string;
  };
  form: {
    label: string;
    details: string;
    name: string;
    email: string;
    company: string;
    topic: string;
    consent: string;
    consentLink: string;
    honeypot: string;
    submit: string;
    sending: string;
    noscript: string;
  };
  success: {
    title: string;
    when: string;
    text: string;
    meet: string;
    meetLater: string;
  };
  errors: {
    taken: string;
    dayFull: string;
    limit: string;
    send: string;
    captcha: string;
    rate: string;
  };
  unavailable: { title: string; text: string };
  empty: { title: string; text: string };
  contactMail: string;
  llms: string;
};
