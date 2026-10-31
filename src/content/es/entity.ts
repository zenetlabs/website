import type { Country, LegalEntity } from '@/content/types';

export const entity = {
  kind: 'sole-trader',
  legalName: 'Albert Sabaté Martínez',
  taxId: { scheme: 'NIF', value: '47986151D' },
  // TODO(albert): Spanish fiscal address. Setting it moves every es page to this entity (footer, legal pages, form consent, JSON-LD). In the same commit, bump every PAGES lastmod and the `updated` dates of the es legal pages, and update the footer line in scripts/smoke.sh.
  address: null,
  jsonLd: {
    type: 'ProfessionalService',
    idPath: '/es#business',
    urlPath: '/es',
  },
} satisfies LegalEntity;

export const countryNames = {
  SG: 'Singapur',
  ES: 'España',
} satisfies Record<Country, string>;
