import type {
  Article,
  BreadcrumbList,
  FAQPage,
  Offer,
  OfferCatalog,
  PriceSpecification,
  Service as ServiceSchema,
  UnitPriceSpecification,
  WithContext,
} from 'schema-dts';
import type {
  CalculatorPageContent,
  CasePageContent,
  Country,
  FaqItem,
  Price,
  PricingPageContent,
  PublishedEntity,
  Service,
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { legalEntity } from '@/lib/content';
import { crumbName, hubNames, type Names } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { ogImagePath } from '@/lib/og-image';
import {
  breadcrumbTrail,
  type LandingPageId,
  PAGES,
  type PageId,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { jsonLd, pageUrl, SITE_NAME } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { FOUNDER_ID } from '@/lib/structured-data';
import { titleText } from '@/lib/title-text';

type Entries = ReturnType<typeof jsonLd>[];

const COUNTRY: Record<Locale, Country> = { en: 'SG', es: 'ES' };

function faqPageNode(
  locale: Locale,
  page: PageId,
  faq: readonly FaqItem[],
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl(locale, page)}#faq`,
    inLanguage: locale,
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

function breadcrumbNode(
  locale: Locale,
  page: PageId,
  names: Names,
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbTrail(page).map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumbName(names, step),
      item: pageUrl(locale, step),
    })),
  };
}

function priceSpecification(
  price: Price,
): PriceSpecification | UnitPriceSpecification {
  const currency: Pick<PriceSpecification, 'priceCurrency'> &
    Pick<PriceSpecification, 'valueAddedTaxIncluded'> = {
    priceCurrency: price.currency,
    valueAddedTaxIncluded: false,
  };
  const amount: Pick<PriceSpecification, 'price' | 'minPrice' | 'maxPrice'> =
    price.max !== undefined
      ? { minPrice: price.min, maxPrice: price.max }
      : price.qualifier === 'from'
        ? { minPrice: price.min }
        : { price: price.min };
  if (price.unit === 'month') {
    return {
      '@type': 'UnitPriceSpecification',
      unitCode: 'MON',
      ...amount,
      ...currency,
    };
  }
  return { '@type': 'PriceSpecification', ...amount, ...currency };
}

function offerNode(
  locale: Locale,
  service: Service,
  price: Price,
  providerId: string,
): Offer {
  const name = price.label ? `${service.name}: ${price.label}` : service.name;
  return {
    '@type': 'Offer',
    name,
    url: `${pageUrl(locale, 'pricing')}#${service.id}`,
    itemOffered: {
      '@type': 'Service',
      name,
      description: service.summary,
      provider: { '@id': providerId },
      areaServed: COUNTRY[locale],
    },
    priceSpecification: priceSpecification(price),
  };
}

function catalogNode(
  locale: Locale,
  catalog: string,
  services: Services,
  entity: PublishedEntity,
): WithContext<OfferCatalog> {
  const providerId = `${SITE.url}${entity.jsonLd.idPath}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': `${pageUrl(locale, 'pricing')}#catalog`,
    name: catalog,
    url: pageUrl(locale, 'pricing'),
    itemListElement: Object.values(services).flatMap((service) =>
      service.prices.map((price) =>
        offerNode(locale, service, price, providerId),
      ),
    ),
  };
}

function serviceNode(
  locale: Locale,
  page: ServicePageId | LandingPageId,
  copy: Pick<ServicePageContent, 'meta'>,
  hub: ServicesHubContent,
  services: Services,
  entity: PublishedEntity,
): WithContext<ServiceSchema> {
  const url = pageUrl(locale, page);
  const id = `${url}#service`;
  const name = crumbName(hubNames(hub), page);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': id,
    name,
    description: copy.meta.description,
    url,
    provider: { '@id': `${SITE.url}${entity.jsonLd.idPath}` },
    areaServed: COUNTRY[locale],
    offers: services[serviceOf(page)].prices.map(
      (price): Offer => ({
        '@type': 'Offer',
        name: price.label ? `${name}: ${price.label}` : name,
        url,
        itemOffered: { '@id': id },
        priceSpecification: priceSpecification(price),
      }),
    ),
  };
}

function articleNode(
  locale: Locale,
  copy: CasePageContent,
  entity: PublishedEntity,
): WithContext<Article> {
  const url = pageUrl(locale, 'viatsyCase');
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: titleText(copy.title),
    description: copy.meta.description,
    inLanguage: locale,
    url,
    datePublished: copy.published,
    dateModified: PAGES.viatsyCase.lastmod,
    image: `${SITE.url}${ogImagePath(locale)}`,
    author: { '@id': FOUNDER_ID },
    publisher: { '@id': `${SITE.url}${entity.jsonLd.idPath}` },
  };
}

const byFaq = new WeakMap<object, Entries>();
const byEntity = new WeakMap<object, WeakMap<object, Entries>>();
const byPage = new Map<string, Entries>();
const byHub = new WeakMap<object, Entries>();
const byCalculator = new WeakMap<object, Entries>();

export function homeStructuredData(locale: Locale, faq: readonly FaqItem[]) {
  const found = byFaq.get(faq);
  if (found) return found;
  const made = [jsonLd(faqPageNode(locale, 'home', faq))];
  byFaq.set(faq, made);
  return made;
}

function cached(
  entity: PublishedEntity,
  key: object,
  make: () => Entries,
): Entries {
  const forEntity = byEntity.get(entity) ?? new WeakMap<object, Entries>();
  byEntity.set(entity, forEntity);
  const found = forEntity.get(key);
  if (found) return found;
  const made = make();
  forEntity.set(key, made);
  return made;
}

export function pricingStructuredData(
  locale: Locale,
  page: PricingPageContent,
  services: Services,
  entity: PublishedEntity = legalEntity(locale),
) {
  return cached(entity, page, () => [
    jsonLd(catalogNode(locale, page.catalog, services, entity)),
    jsonLd(
      breadcrumbNode(locale, 'pricing', {
        home: SITE_NAME,
        pricing: page.meta.title,
      }),
    ),
  ]);
}

export function breadcrumbStructuredData(
  locale: Locale,
  page: PageId,
  name: string,
) {
  const key = `${locale}:${page}`;
  const found = byPage.get(key);
  if (found) return found;
  const made = [
    jsonLd(breadcrumbNode(locale, page, { home: SITE_NAME, [page]: name })),
  ];
  byPage.set(key, made);
  return made;
}

export function calculatorStructuredData(
  locale: Locale,
  page: CalculatorPageContent,
) {
  const found = byCalculator.get(page);
  if (found) return found;
  const made = [
    jsonLd(
      breadcrumbNode(locale, 'calculator', {
        home: SITE_NAME,
        pricing: page.breadcrumb.pricing,
        calculator: page.meta.title,
      }),
    ),
  ];
  byCalculator.set(page, made);
  return made;
}

export function servicesHubStructuredData(
  locale: Locale,
  hub: ServicesHubContent,
) {
  const found = byHub.get(hub);
  if (found) return found;
  const made = [jsonLd(breadcrumbNode(locale, 'services', hubNames(hub)))];
  byHub.set(hub, made);
  return made;
}

export function serviceStructuredData(
  locale: Locale,
  page: ServicePageId | LandingPageId,
  copy: Pick<ServicePageContent, 'meta' | 'faq'>,
  hub: ServicesHubContent,
  services: Services,
  entity: PublishedEntity = legalEntity(locale),
) {
  return cached(entity, copy, () => [
    jsonLd(serviceNode(locale, page, copy, hub, services, entity)),
    jsonLd(breadcrumbNode(locale, page, hubNames(hub))),
    jsonLd(faqPageNode(locale, page, copy.faq.items)),
  ]);
}

export function caseStructuredData(
  locale: Locale,
  copy: CasePageContent,
  hub: ServicesHubContent,
  entity: PublishedEntity = legalEntity(locale),
) {
  return cached(entity, copy, () => [
    jsonLd(breadcrumbNode(locale, 'viatsyCase', hubNames(hub))),
    jsonLd(articleNode(locale, copy, entity)),
  ]);
}
