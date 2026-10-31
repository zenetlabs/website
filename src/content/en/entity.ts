import type { Country, PublishedEntity } from '@/content/types';

export const entity = {
  kind: 'company',
  legalName: 'Zenet Technology Pte. Ltd.',
  taxId: { scheme: 'UEN', value: '202202371M' },
  address: {
    streetAddress: '160 Robinson Road #14-04',
    postalCode: '068914',
    locality: 'Singapore',
    country: 'SG',
  },
  foundingYear: '2022',
  founder: 'Albert Sabaté',
  jsonLd: { type: 'Organization', idPath: '/#organization', urlPath: '/' },
} satisfies PublishedEntity;

export const countryNames = {
  SG: 'Singapore',
  ES: 'Spain',
} satisfies Record<Country, string>;
