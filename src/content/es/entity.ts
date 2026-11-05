import type { Country, LegalEntity } from '@/content/types';

export const entity = {
  kind: 'sole-trader',
  legalName: 'Albert Sabaté Martínez',
  taxId: { scheme: 'NIF', value: '47986151D' },
  address: {
    streetAddress: 'Carrer Gretel Ammann Martínez, 12',
    postalCode: '08020',
    locality: 'Barcelona',
    country: 'ES',
  },
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
