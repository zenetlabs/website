import * as en from '@/content/en/entity';
import { founder as enFounder } from '@/content/en/founder';
import * as es from '@/content/es/entity';
import { founder as esFounder } from '@/content/es/founder';
import type {
  LegalEntity,
  PostalAddress,
  PublishedEntity,
  SiteContent,
} from '@/content/types';
import { type Locale, messages } from '@/lib/i18n';

export const CONTENT: Record<Locale, SiteContent> = {
  en: {
    entity: en.entity,
    countryNames: en.countryNames,
    founder: enFounder,
  },
  es: {
    entity: es.entity,
    countryNames: es.countryNames,
    founder: esFounder,
  },
};

export function hasAddress(entity: LegalEntity): entity is PublishedEntity {
  return entity.address !== null;
}

export function legalEntity(locale: Locale): PublishedEntity {
  const own = CONTENT[locale].entity;
  return hasAddress(own) ? own : en.entity;
}

export function formatAddress(address: PostalAddress, locale: Locale): string {
  const { streetAddress, postalCode, locality, region, country } = address;
  if (country === 'SG') {
    return `${streetAddress}, ${CONTENT[locale].countryNames[country]} ${postalCode}`;
  }
  const area = region && region !== locality ? ` (${region})` : '';
  return `${streetAddress}, ${postalCode} ${locality}${area}`;
}

export function taxIdLabel(entity: LegalEntity): string {
  return `${entity.taxId.scheme} ${entity.taxId.value}`;
}

export function describeEntity(
  template: string,
  entity: PublishedEntity,
  locale: Locale,
): string {
  return template
    .replaceAll('{legalName}', entity.legalName)
    .replaceAll('{taxId}', taxIdLabel(entity))
    .replaceAll('{address}', formatAddress(entity.address, locale));
}

export function foundedLine(
  entity: LegalEntity,
  locale: Locale,
): string | undefined {
  const { foundingYear, founder } = entity;
  if (!foundingYear || !founder) return undefined;
  return messages[locale].footer.founded
    .replace('{year}', foundingYear)
    .replace('{founder}', founder);
}
