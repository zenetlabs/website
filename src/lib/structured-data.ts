import { COMPANY } from '@/lib/company';
import { type Locale, messages } from '@/lib/i18n';
import { jsonLd, SITE_NAME } from '@/lib/seo';
import { serviceSummary } from '@/lib/services';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';

const ORGANIZATION_ID = `${SITE.url}/#organization`;

function structuredData(locale: Locale) {
  const copy = messages[locale];
  return [
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      legalName: COMPANY.legalName,
      url: SITE.url,
      logo: `${SITE.url}/icons/android-chrome-512x512.png`,
      email: PUBLIC_EMAIL,
      description: copy.meta.description,
      areaServed: 'Worldwide',
      knowsAbout: Object.values(copy.organization.knowsAbout),
      makesOffer: Object.values(copy.services.items).map((item) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', ...serviceSummary(item) },
      })),
      foundingDate: COMPANY.foundingYear,
      founder: { '@type': 'Person', name: COMPANY.founder },
      address: {
        '@type': 'PostalAddress',
        streetAddress: COMPANY.streetAddress,
        addressLocality: COMPANY.locality,
        postalCode: COMPANY.postalCode,
        addressCountry: COMPANY.country,
      },
    }),
    jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      name: SITE_NAME,
      url: SITE.url,
      inLanguage: ['en', 'es'],
      publisher: { '@id': ORGANIZATION_ID },
    }),
  ];
}

export const STRUCTURED_DATA: Record<
  Locale,
  ReturnType<typeof structuredData>
> = { en: structuredData('en'), es: structuredData('es') };
