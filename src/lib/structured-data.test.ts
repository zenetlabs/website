import { describe, expect, it } from 'vitest';
import { legalEntity } from '@/lib/content';
import { locales, messages } from '@/lib/i18n';
import { STRUCTURED_DATA, structuredData } from '@/lib/structured-data';
import { FLIPPED } from '../../test/entities';
import {
  identityProblems,
  jsonLdBlocks,
  validateJsonLd,
} from '../../test/json-ld';

const ORIGIN = 'https://zenetlabs.com';

function blocks(entries: ReturnType<typeof structuredData>): unknown[] {
  return entries.map((entry): unknown => JSON.parse(entry.children));
}

function script(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

const GOOD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${ORIGIN}/#organization`,
  name: 'Zenet Labs',
  url: `${ORIGIN}/`,
  logo: `${ORIGIN}/logo.png`,
};

function problemsOf(patch: Record<string, unknown>, extra: unknown[] = []) {
  return validateJsonLd([{ ...GOOD, ...patch }, ...extra], ORIGIN);
}

describe('validateJsonLd', () => {
  it('accepts a minimal organization', () => {
    expect(validateJsonLd([GOOD], ORIGIN)).toEqual([]);
  });

  it.each([
    ['a foreign context', { '@context': 'http://schema.org' }],
    ['an unknown type', { '@type': 'Thingamajig' }],
    ['a missing required property', { logo: undefined }],
    ['a null value', { description: null }],
    ['an empty string', { description: '' }],
    ['an empty array', { knowsAbout: [] }],
    ['a placeholder', { description: 'TODO(albert): write this' }],
    ['a bracket placeholder', { description: 'Reach us at [EMAIL_AVISOS]' }],
    ['a relative url', { url: '/es' }],
    ['a foreign url', { logo: 'https://evil.example/logo.png' }],
    ['a foreign sameAs', { sameAs: ['https://linkedin.com/in/x'] }],
    ['a non-finite number', { employees: Number.POSITIVE_INFINITY }],
    ['a bad country', { address: addressWith({ addressCountry: 'Spain' }) }],
    ['a bad language', { inLanguage: 'fr' }],
    ['a bad currency', { priceCurrency: 'USD' }],
    ['a reference to nothing', { publisher: { '@id': `${ORIGIN}/#nope` } }],
  ])('rejects %s', (_name, patch) => {
    expect(problemsOf(patch)).not.toEqual([]);
  });

  it('rejects a duplicate node id', () => {
    expect(problemsOf({}, [GOOD])).not.toEqual([]);
  });

  it('accepts a reference to a node defined on the same page', () => {
    expect(
      problemsOf({ publisher: { '@id': `${ORIGIN}/#organization` } }),
    ).toEqual([]);
  });

  it('rejects a website without a publisher', () => {
    const site = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'x',
      url: `${ORIGIN}/`,
      inLanguage: 'en',
    };
    expect(validateJsonLd([site], ORIGIN)).toEqual([
      'block 0: WebSite lacks publisher',
    ]);
  });
});

function addressWith(patch: Record<string, string>) {
  return {
    '@type': 'PostalAddress',
    streetAddress: 'x',
    addressLocality: 'x',
    postalCode: '1',
    addressCountry: 'SG',
    ...patch,
  };
}

describe('jsonLdBlocks', () => {
  it('extracts every json-ld script and ignores the others', () => {
    const html = `<script>var a=1</script>${script(GOOD)}${script({ a: 1 })}`;
    expect(jsonLdBlocks(html)).toEqual([GOOD, { a: 1 }]);
  });
});

describe('identityProblems', () => {
  it('accepts the same identity on two pages', () => {
    expect(
      identityProblems(
        new Map([
          ['/', [GOOD]],
          ['/es', [GOOD]],
        ]),
      ),
    ).toEqual([]);
  });

  it('flags one id carrying two legal names', () => {
    expect(
      identityProblems(
        new Map([
          ['/', [{ ...GOOD, legalName: 'A' }]],
          ['/es', [{ ...GOOD, legalName: 'B' }]],
        ]),
      ),
    ).toHaveLength(1);
  });

  it.each([
    ['email', { email: 'other@zenetlabs.com' }],
    [
      'identifier',
      {
        identifier: { '@type': 'PropertyValue', propertyID: 'NIF', value: 'x' },
      },
    ],
    ['description', { description: 'other' }],
  ])('flags one id carrying a different %s', (_name, patch) => {
    expect(
      identityProblems(
        new Map([
          ['/', [{ ...GOOD, email: 'hello@zenetlabs.com' }]],
          ['/es', [{ ...GOOD, email: 'hello@zenetlabs.com', ...patch }]],
        ]),
      ),
    ).toHaveLength(1);
  });

  it('ignores key order and bare references', () => {
    const reordered = Object.fromEntries(Object.entries(GOOD).reverse());
    expect(
      identityProblems(
        new Map([
          ['/', [GOOD, { '@id': GOOD['@id'] }]],
          ['/es', [reordered]],
        ]),
      ),
    ).toEqual([]);
  });
});

describe.each(locales)('structured data (%s)', (locale) => {
  const entries = blocks(STRUCTURED_DATA[locale]);
  const json = STRUCTURED_DATA[locale].map((entry) => entry.children).join('');
  const [organization, website] = entries;

  it('is valid', () => {
    expect(validateJsonLd(entries, ORIGIN)).toEqual([]);
  });

  it('has an organization and a website', () => {
    expect(entries).toHaveLength(2);
    expect(organization).toMatchObject({
      '@id': `${ORIGIN}/#organization`,
      legalName: 'Zenet Technology Pte. Ltd.',
      taxID: '202202371M',
      email: 'hello@zenetlabs.com',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'UEN',
        value: '202202371M',
      },
      address: {
        streetAddress: '160 Robinson Road #14-04',
        addressLocality: 'Singapore',
        postalCode: '068914',
        addressCountry: 'SG',
      },
    });
  });

  it('gives the website its own id, description, language and publisher', () => {
    expect(website).toMatchObject({
      description: messages[locale].meta.description,
      '@id': locale === 'en' ? `${ORIGIN}/#website` : `${ORIGIN}/es#website`,
      inLanguage: locale,
      publisher: { '@id': `${ORIGIN}/#organization` },
    });
  });

  it('keeps the organization to identity fields only', () => {
    expect(Object.keys(organization ?? {}).sort()).toEqual(
      [
        '@context',
        '@type',
        '@id',
        'name',
        'legalName',
        'taxID',
        'identifier',
        'url',
        'logo',
        'email',
        'address',
        'foundingDate',
        'founder',
      ].sort(),
    );
  });

  it('claims no social profiles', () => {
    expect(json).not.toContain('sameAs');
  });
});

describe('structured data across locales', () => {
  it('localises the website description but keeps one organization node', () => {
    const en = blocks(STRUCTURED_DATA.en);
    const es = blocks(STRUCTURED_DATA.es);
    expect(en[0]).toEqual(es[0]);
    expect(en[1]).not.toEqual(es[1]);
    expect(
      identityProblems(
        new Map([
          ['/', en],
          ['/es', es],
        ]),
      ),
    ).toEqual([]);
  });

  it('shares the entity id between en and the es fallback', () => {
    expect(legalEntity('es').jsonLd.idPath).toBe(
      legalEntity('en').jsonLd.idPath,
    );
  });
});

describe('structured data for the flipped Spanish entity', () => {
  const entries = blocks(structuredData('es', FLIPPED));

  it('is valid', () => {
    expect(validateJsonLd(entries, ORIGIN)).toEqual([]);
  });

  it('describes a professional service with its tax id and address', () => {
    expect(entries[0]).toMatchObject({
      '@type': 'ProfessionalService',
      '@id': `${ORIGIN}/es#business`,
      url: `${ORIGIN}/es`,
      legalName: 'Albert Sabaté Martínez',
      taxID: '47986151D',
      identifier: {
        '@type': 'PropertyValue',
        propertyID: 'NIF',
        value: '47986151D',
      },
      address: {
        streetAddress: 'Calle Ejemplo 1',
        addressLocality: 'Barcelona',
        postalCode: '08001',
        addressCountry: 'ES',
      },
    });
    expect(entries[0]).not.toHaveProperty('founder');
    expect(entries[0]).not.toHaveProperty('foundingDate');
  });

  it('publishes the es website under the sole trader', () => {
    expect(entries[1]).toMatchObject({
      '@id': `${ORIGIN}/es#website`,
      publisher: { '@id': `${ORIGIN}/es#business` },
    });
  });

  it('keeps the two legal persons apart across pages', () => {
    const en = blocks(STRUCTURED_DATA.en);
    expect(
      identityProblems(
        new Map([
          ['/', en],
          ['/es', entries],
        ]),
      ),
    ).toEqual([]);
  });

  it('flags a flipped es that reuses the Singapore id', () => {
    const reused = {
      ...FLIPPED,
      jsonLd: { ...FLIPPED.jsonLd, idPath: '/#organization' as const },
    };
    expect(
      identityProblems(
        new Map([
          ['/', blocks(STRUCTURED_DATA.en)],
          ['/es', blocks(structuredData('es', reused))],
        ]),
      ),
    ).not.toEqual([]);
  });
});
