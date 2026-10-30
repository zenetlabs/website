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
