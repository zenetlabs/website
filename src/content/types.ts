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
  legalEs: SpanishLegalClauses;
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
export type CaseStudy = {
  id: 'viatsy' | 'taplany';
  name: string;
  tag: string;
  context: string;
  automated: readonly string[];
  metrics: readonly Metric[];
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
  services: SectionCopy & { more: string };
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
  contact: SectionCopy & { mail: string; human: string };
};

export type PricingPageContent = {
  eyebrow: string;
  title: TitleParts;
  lead: string;
  taxNote: string;
  labels: { price: string; includes: string; timeline: string };
  details: Record<
    ServiceId,
    { includes: readonly string[]; timeline?: string }
  >;
  how: { title: string; items: readonly string[] };
  cta: { title: string; text: string; button: string; faq: string };
};

export type AboutPageContent = {
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
    | 'about',
    string
  >;
  labels: Record<'email' | 'form' | 'full' | 'index' | 'otherLanguage', string>;
};

export type SiteContent = {
  entity: LegalEntity;
  countryNames: Record<Country, string>;
  founder: Founder;
};
