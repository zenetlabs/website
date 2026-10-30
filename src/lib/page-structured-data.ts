import type {
  BreadcrumbList,
  FAQPage,
  Offer,
  OfferCatalog,
  PriceSpecification,
  UnitPriceSpecification,
  WithContext,
} from 'schema-dts';
import type {
  Country,
  FaqItem,
  Price,
  PublishedEntity,
  Service,
  Services,
} from '@/content/types';
import { legalEntity } from '@/lib/content';
import { type Locale, messages } from '@/lib/i18n';
import type { PageId } from '@/lib/page-registry';
import { pageName } from '@/lib/pages';
import { jsonLd, pageUrl, SITE_NAME } from '@/lib/seo';
import { SITE } from '@/lib/site';

type Entries = ReturnType<typeof jsonLd>[];

const COUNTRY: Record<Locale, Country> = { en: 'SG', es: 'ES' };

function faqNode(
  locale: Locale,
  faq: readonly FaqItem[],
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl(locale, 'home')}#faq`,
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
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: pageUrl(locale, 'home'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName(locale, page),
        item: pageUrl(locale, page),
      },
    ],
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
  services: Services,
  entity: PublishedEntity,
): WithContext<OfferCatalog> {
  const providerId = `${SITE.url}${entity.jsonLd.idPath}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': `${pageUrl(locale, 'pricing')}#catalog`,
    name: messages[locale].pricing.catalog,
    url: pageUrl(locale, 'pricing'),
    itemListElement: Object.values(services).flatMap((service) =>
      service.prices.map((price) =>
        offerNode(locale, service, price, providerId),
      ),
    ),
  };
}

const byFaq = new WeakMap<object, Entries>();
const byEntity = new WeakMap<object, WeakMap<object, Entries>>();
const byPage = new Map<string, Entries>();

export function homeStructuredData(locale: Locale, faq: readonly FaqItem[]) {
  const found = byFaq.get(faq);
  if (found) return found;
  const made = [jsonLd(faqNode(locale, faq))];
  byFaq.set(faq, made);
  return made;
}

export function pricingStructuredData(
  locale: Locale,
  services: Services,
  entity: PublishedEntity = legalEntity(locale),
) {
  const forEntity = byEntity.get(entity) ?? new WeakMap<object, Entries>();
  byEntity.set(entity, forEntity);
  const found = forEntity.get(services);
  if (found) return found;
  const made = [
    jsonLd(catalogNode(locale, services, entity)),
    jsonLd(breadcrumbNode(locale, 'pricing')),
  ];
  forEntity.set(services, made);
  return made;
}

export function breadcrumbStructuredData(locale: Locale, page: PageId) {
  const key = `${locale}:${page}`;
  const found = byPage.get(key);
  if (found) return found;
  const made = [jsonLd(breadcrumbNode(locale, page))];
  byPage.set(key, made);
  return made;
}
