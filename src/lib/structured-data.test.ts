import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { legalEntity } from '@/lib/content';
import { type Locale, locales, messages } from '@/lib/i18n';
import { PAGE_IDS, type PageId, pageLocales } from '@/lib/page-registry';
import {
  breadcrumbStructuredData,
  homeStructuredData,
  pricingStructuredData,
} from '@/lib/page-structured-data';
import {
  FOUNDER_ID,
  STRUCTURED_DATA,
  structuredData,
} from '@/lib/structured-data';
import { FLIPPED } from '../../test/entities';
import { FAQ } from '../../test/faq';
import {
  faqVisibilityProblems,
  identityProblems,
  jsonLdBlocks,
  validateJsonLd,
} from '../../test/json-ld';
import { SERVICES } from '../../test/page-content';

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
  const [organization, website, person] = entries;

  it('is valid', () => {
    expect(validateJsonLd(entries, ORIGIN)).toEqual([]);
  });

  it('has an organization, a website and the founder', () => {
    expect(entries).toHaveLength(3);
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

  it('references the founder from the organization and defines him once', () => {
    expect(organization).toMatchObject({ founder: { '@id': FOUNDER_ID } });
    expect(FOUNDER_ID).toBe(`${ORIGIN}/about#founder`);
    expect(person).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': FOUNDER_ID,
      name: 'Albert Sabaté',
      url: `${ORIGIN}/about`,
    });
  });

  it('claims no social profiles', () => {
    expect(json).not.toContain('sameAs');
  });
});

describe('structured data across locales', () => {
  it('localises the website description but keeps one organization and founder node', () => {
    const en = blocks(STRUCTURED_DATA.en);
    const es = blocks(STRUCTURED_DATA.es);
    expect(en[0]).toEqual(es[0]);
    expect(en[1]).not.toEqual(es[1]);
    expect(en[2]).toEqual(es[2]);
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

  it('leaves the founder node unchanged and unreferenced by the sole trader', () => {
    expect(entries[2]).toEqual(blocks(STRUCTURED_DATA.en)[2]);
    expect(entries[0]).not.toHaveProperty('founder');
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

function routeData(locale: Locale, id: PageId) {
  switch (id) {
    case 'home':
      return homeStructuredData(locale, FAQ[locale]);
    case 'pricing':
      return pricingStructuredData(locale, SERVICES[locale]);
    default:
      return breadcrumbStructuredData(locale, id);
  }
}

const specSchema = z.object({
  '@type': z.string(),
  priceCurrency: z.string(),
  valueAddedTaxIncluded: z.boolean(),
  unitCode: z.string().optional(),
  price: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

const catalogSchema = z.object({
  '@id': z.string(),
  name: z.string(),
  itemListElement: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      itemOffered: z.object({
        '@type': z.literal('Service'),
        provider: z.object({ '@id': z.string() }),
        areaServed: z.string(),
      }),
      priceSpecification: specSchema,
    }),
  ),
});

const breadcrumbSchema = z.object({
  itemListElement: z.array(
    z.object({ position: z.number(), name: z.string(), item: z.string() }),
  ),
});

describe.each(locales)('route structured data (%s)', (locale) => {
  const layout = blocks(STRUCTURED_DATA[locale]);
  const base = locale === 'en' ? ORIGIN : `${ORIGIN}/es`;

  function page(id: (typeof PAGE_IDS)[number]) {
    return blocks(routeData(locale, id));
  }

  it('is valid on every page together with the layout blocks', () => {
    for (const id of PAGE_IDS) {
      if (!pageLocales(id).includes(locale)) continue;
      expect(validateJsonLd([...layout, ...page(id)], ORIGIN), id).toEqual([]);
    }
  });

  it('puts only the FAQPage on the home page, with the visible texts', () => {
    const [faq, ...rest] = page('home');
    expect(rest).toEqual([]);
    expect(faq).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${base}${locale === 'en' ? '/' : ''}#faq`,
      inLanguage: locale,
      mainEntity: FAQ[locale].map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    });
  });

  it('describes the ladder as ten offers excluding tax', () => {
    const catalog = catalogSchema.parse(page('pricing')[0]);
    const rows = Object.values(SERVICES[locale]).flatMap((service) =>
      service.prices.map((price) => ({ service, price })),
    );
    expect(rows).toHaveLength(10);
    expect(catalog.itemListElement).toHaveLength(10);
    const pricing = `${base}${locale === 'en' ? '/pricing' : '/precios'}`;
    expect(catalog['@id']).toBe(`${pricing}#catalog`);
    expect(catalog.name).toBe(messages[locale].pricing.catalog);

    for (const [index, { service, price }] of rows.entries()) {
      const offer = catalog.itemListElement[index];
      const spec = offer?.priceSpecification;
      const label = price.label ? `: ${price.label}` : '';
      expect(offer?.name).toBe(`${service.name}${label}`);
      expect(offer?.url).toBe(`${pricing}#${service.id}`);
      expect(offer?.itemOffered.provider['@id']).toBe(
        `${ORIGIN}/#organization`,
      );
      expect(offer?.itemOffered.areaServed).toBe(locale === 'en' ? 'SG' : 'ES');
      expect(spec?.priceCurrency).toBe(locale === 'en' ? 'SGD' : 'EUR');
      expect(spec?.valueAddedTaxIncluded).toBe(false);
      expect(spec?.['@type']).toBe(
        price.unit === 'month'
          ? 'UnitPriceSpecification'
          : 'PriceSpecification',
      );
      expect(spec?.unitCode).toBe(price.unit === 'month' ? 'MON' : undefined);
      if (price.max !== undefined) {
        expect([spec?.minPrice, spec?.maxPrice]).toEqual([
          price.min,
          price.max,
        ]);
        expect(spec?.price).toBeUndefined();
      } else if (price.qualifier === 'from') {
        expect([spec?.minPrice, spec?.maxPrice]).toEqual([
          price.min,
          undefined,
        ]);
        expect(spec?.price).toBeUndefined();
      } else {
        expect(spec?.price).toBe(price.min);
        expect(spec?.minPrice).toBeUndefined();
      }
    }
  });

  it.each(PAGE_IDS.filter((id) => id !== 'home'))(
    'adds a two-step breadcrumb to %s',
    (id) => {
      if (!pageLocales(id).includes(locale)) return;
      const crumbs = page(id).find(
        (block) => breadcrumbSchema.safeParse(block).success,
      );
      const { itemListElement } = breadcrumbSchema.parse(crumbs);
      expect(itemListElement.map((entry) => entry.position)).toEqual([1, 2]);
      expect(itemListElement[0]).toMatchObject({
        name: 'Zenet Labs',
        item: `${base}${locale === 'en' ? '/' : ''}`,
      });
      expect(itemListElement[1]?.item.startsWith(ORIGIN)).toBe(true);
    },
  );
});

describe('pricing structured data for the flipped Spanish entity', () => {
  const providers = (entity?: typeof FLIPPED) =>
    catalogSchema
      .parse(blocks(pricingStructuredData('es', SERVICES.es, entity))[0])
      .itemListElement.map((offer) => offer.itemOffered.provider['@id']);

  it('points every offer at the entity of the moment, without cache leaks', () => {
    const singapore = `${ORIGIN}/#organization`;
    const sole = `${ORIGIN}/es#business`;
    expect(new Set(providers())).toEqual(new Set([singapore]));
    expect(new Set(providers(FLIPPED))).toEqual(new Set([sole]));
    expect(new Set(providers())).toEqual(new Set([singapore]));
  });
});

describe('route structured data per page', () => {
  it('puts the catalog only on pricing and the FAQ only on home', () => {
    const types = (id: (typeof PAGE_IDS)[number]) =>
      blocks(routeData('en', id)).map(
        (block) => z.object({ '@type': z.string() }).parse(block)['@type'],
      );
    expect(types('home')).toEqual(['FAQPage']);
    expect(types('pricing')).toEqual(['OfferCatalog', 'BreadcrumbList']);
    expect(types('about')).toEqual(['BreadcrumbList']);
    expect(types('privacy')).toEqual(['BreadcrumbList']);
  });
});

describe('validateJsonLd on the new types', () => {
  const unit = {
    '@type': 'UnitPriceSpecification',
    unitCode: 'MON',
    priceCurrency: 'SGD',
    valueAddedTaxIncluded: false,
    price: 500,
  };
  const service = {
    '@type': 'Service',
    name: 'x',
    provider: { '@id': `${ORIGIN}/#organization` },
  };
  const offer = {
    '@type': 'Offer',
    itemOffered: service,
    priceSpecification: unit,
  };
  const catalog = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'x',
    itemListElement: [offer],
  };
  const question = {
    '@type': 'Question',
    name: 'q?',
    acceptedAnswer: { '@type': 'Answer', text: 'a' },
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [question],
  };
  const crumbs = (positions: number[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: positions.map((position) => ({
      '@type': 'ListItem',
      position,
      name: 'n',
      item: `${ORIGIN}/`,
    })),
  });

  function check(...blocksToCheck: unknown[]) {
    return validateJsonLd([GOOD, ...blocksToCheck], ORIGIN);
  }

  it('accepts a good catalog, FAQ and breadcrumb', () => {
    expect(check(catalog, faq, crumbs([1, 2]))).toEqual([]);
  });

  it.each([
    [
      'a question without an answer',
      { ...faq, mainEntity: [{ ...question, acceptedAnswer: undefined }] },
    ],
    [
      'an answer without text',
      {
        ...faq,
        mainEntity: [{ ...question, acceptedAnswer: { '@type': 'Answer' } }],
      },
    ],
    [
      'tax included',
      {
        ...catalog,
        itemListElement: [
          {
            ...offer,
            priceSpecification: { ...unit, valueAddedTaxIncluded: true },
          },
        ],
      },
    ],
    [
      'maxPrice not above minPrice',
      {
        ...catalog,
        itemListElement: [
          {
            ...offer,
            priceSpecification: {
              ...unit,
              price: undefined,
              minPrice: 5,
              maxPrice: 5,
            },
          },
        ],
      },
    ],
    [
      'an offer without a price',
      {
        ...catalog,
        itemListElement: [{ ...offer, priceSpecification: undefined }],
      },
    ],
    [
      'a unit price without a unit code',
      {
        ...catalog,
        itemListElement: [
          { ...offer, priceSpecification: { ...unit, unitCode: undefined } },
        ],
      },
    ],
    [
      'a service without a provider',
      {
        ...catalog,
        itemListElement: [
          { ...offer, itemOffered: { ...service, provider: undefined } },
        ],
      },
    ],
    ['a gap in the breadcrumb positions', crumbs([1, 3])],
    ['a breadcrumb starting at zero', crumbs([0, 1])],
  ])('rejects %s', (_name, block) => {
    expect(check(block)).not.toEqual([]);
  });
});

describe('faqVisibilityProblems', () => {
  const blocksFor = [
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Cost?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: "From S$8,000 — it's fixed.",
          },
        },
      ],
    },
  ];

  it('passes when the main text shows the question and the answer', () => {
    const html =
      '<header>x</header><main><details><summary>Cost? <span>+</span></summary><p>From S$8,000 — it&#x27;s   fixed.</p></details></main>';
    expect(faqVisibilityProblems(html, blocksFor)).toEqual([]);
  });

  it('flags a missing answer and ignores text outside main', () => {
    const html =
      "<header>From S$8,000 — it's fixed.</header><main><summary>Cost?</summary></main>";
    expect(faqVisibilityProblems(html, blocksFor)).toEqual([
      'answer not visible: Cost?',
    ]);
  });

  it('ignores scripts inside main', () => {
    const html =
      '<main><p>Cost?</p><script type="application/ld+json">From S$8,000 — it\'s fixed.</script></main>';
    expect(faqVisibilityProblems(html, blocksFor)).toHaveLength(1);
  });
});
