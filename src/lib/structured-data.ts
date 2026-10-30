import type {
  Organization,
  Person,
  ProfessionalService,
  WebSite,
  WithContext,
} from 'schema-dts';
import type { PublishedEntity } from '@/content/types';
import { CONTENT, legalEntity } from '@/lib/content';
import { type Locale, localePath, messages } from '@/lib/i18n';
import { jsonLd, pageUrl, SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';

export const FOUNDER_ID = `${pageUrl('en', 'about')}#founder`;

function entityNode(
  entity: PublishedEntity,
): WithContext<Organization | ProfessionalService> {
  const { address, founder, foundingYear, jsonLd: ids } = entity;
  return {
    '@context': 'https://schema.org',
    '@type': ids.type,
    '@id': `${SITE.url}${ids.idPath}`,
    name: SITE_NAME,
    legalName: entity.legalName,
    taxID: entity.taxId.value,
    identifier: {
      '@type': 'PropertyValue',
      propertyID: entity.taxId.scheme,
      value: entity.taxId.value,
    },
    url: `${SITE.url}${ids.urlPath}`,
    logo: `${SITE.url}/icons/android-chrome-512x512.png`,
    email: PUBLIC_EMAIL,
    ...(foundingYear ? { foundingDate: foundingYear } : {}),
    ...(founder ? { founder: { '@id': FOUNDER_ID } } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.locality,
      ...(address.region ? { addressRegion: address.region } : {}),
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
  };
}

function websiteNode(
  locale: Locale,
  entity: PublishedEntity,
): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}${localePath(locale, '/')}#website`,
    name: SITE_NAME,
    description: messages[locale].meta.description,
    url: pageUrl(locale, 'home'),
    inLanguage: locale,
    publisher: { '@id': `${SITE.url}${entity.jsonLd.idPath}` },
  };
}

function personNode(): WithContext<Person> {
  const { name, photo, sameAs } = CONTENT.en.founder;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name,
    url: pageUrl('en', 'about'),
    ...(photo ? { image: `${SITE.url}${photo.src}` } : {}),
    ...(sameAs.length > 0 ? { sameAs: [...sameAs] } : {}),
  };
}

export function structuredData(
  locale: Locale,
  entity: PublishedEntity = legalEntity(locale),
) {
  return [
    jsonLd(entityNode(entity)),
    jsonLd(websiteNode(locale, entity)),
    jsonLd(personNode()),
  ];
}

export const STRUCTURED_DATA: Record<
  Locale,
  ReturnType<typeof structuredData>
> = { en: structuredData('en'), es: structuredData('es') };
