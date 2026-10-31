import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aboutPage as enAbout } from '@/content/en/about';
import { cases as enCases } from '@/content/en/cases';
import { companies as enCompanies } from '@/content/en/companies';
import {
  countryNames as enCountryNames,
  entity as enEntity,
} from '@/content/en/entity';
import { home as enHome } from '@/content/en/home';
import { llms as enLlms } from '@/content/en/llms';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { aboutPage as esAbout } from '@/content/es/about';
import { cases as esCases } from '@/content/es/cases';
import { companies as esCompanies } from '@/content/es/companies';
import {
  countryNames as esCountryNames,
  entity as esEntity,
} from '@/content/es/entity';
import { home as esHome } from '@/content/es/home';
import { legalNotice } from '@/content/es/legal-notice';
import { llms as esLlms } from '@/content/es/llms';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { verifactuDates } from '@/content/es/verifactu';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';
import {
  CONTENT,
  describeEntity,
  formatAddress,
  foundedLine,
  hasAddress,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { type Locale, locales } from '@/lib/i18n';
import { buildLlmsFull, buildLlmsTxt } from '@/lib/llms';
import { formatPriceSummary } from '@/lib/money';
import { PORTFOLIO } from '@/lib/portfolio';
import { PUBLIC_EMAIL } from '@/lib/site';
import { BARCELONA, FLIPPED } from '../../test/entities';
import { FAQ } from '../../test/faq';
import { CURRENCY, SERVICES } from '../../test/page-content';
import { PLACEHOLDER, stringsOf } from '../../test/placeholders';
import { SERVICE_BODIES } from '../../test/service-bodies';

describe('entities', () => {
  it('gives the English entity an address and a valid UEN', () => {
    expect(hasAddress(enEntity)).toBe(true);
    expect(enEntity.taxId.scheme).toBe('UEN');
    expect(enEntity.taxId.value).toMatch(/^\d{9}[A-Z]$/);
  });

  it('gives the Spanish entity a NIF with the right control letter', () => {
    const { scheme, value } = esEntity.taxId;
    expect(scheme).toBe('NIF');
    expect(value).toMatch(/^\d{8}[A-Z]$/);
    const letter = 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(value.slice(0, 8)) % 23];
    expect(value.slice(8)).toBe(letter);
  });

  it('keeps the Spanish address unset until the owner provides it', () => {
    expect(esEntity.address).toBeNull();
    expect(hasAddress(esEntity)).toBe(false);
  });

  it('gives the two entities separate json-ld ids', () => {
    expect(enEntity.jsonLd.idPath).not.toBe(esEntity.jsonLd.idPath);
  });
});

describe('legalEntity', () => {
  it('serves the English entity to en and, until the flip, to es', () => {
    expect(legalEntity('en')).toBe(enEntity);
    expect(legalEntity('es')).toBe(hasAddress(esEntity) ? esEntity : enEntity);
  });
});

describe('formatAddress', () => {
  it('prints the Singapore form with the locale country name', () => {
    expect(formatAddress(enEntity.address, 'en')).toBe(
      '160 Robinson Road #14-04, Singapore 068914',
    );
    expect(formatAddress(enEntity.address, 'es')).toBe(
      '160 Robinson Road #14-04, Singapur 068914',
    );
  });

  it('prints the Spanish form', () => {
    expect(formatAddress(BARCELONA, 'es')).toBe(
      'Calle Ejemplo 1, 08001 Barcelona',
    );
  });

  it('adds a region only when it differs from the locality', () => {
    expect(formatAddress({ ...BARCELONA, region: 'Barcelona' }, 'es')).toBe(
      'Calle Ejemplo 1, 08001 Barcelona',
    );
    expect(formatAddress({ ...BARCELONA, region: 'Cataluña' }, 'es')).toBe(
      'Calle Ejemplo 1, 08001 Barcelona (Cataluña)',
    );
  });
});

describe('describeEntity', () => {
  it('fills the name, the tax id and the localised address', () => {
    expect(
      describeEntity('{legalName} ({taxId}), {address}', enEntity, 'es'),
    ).toBe(
      'Zenet Technology Pte. Ltd. (UEN 202202371M), 160 Robinson Road #14-04, Singapur 068914',
    );
    expect(describeEntity('{legalName}, {address}', FLIPPED, 'es')).toBe(
      'Albert Sabaté Martínez, Calle Ejemplo 1, 08001 Barcelona',
    );
  });

  it.each([
    ['en', enEntity],
    ['es', esEntity],
  ] as const)('leaves no template slot in the %s Spanish clauses', (_n, e) => {
    const withAddress = e.address ? e : { ...e, address: BARCELONA };
    for (const clause of Object.values(e.legalEs)) {
      expect(describeEntity(clause, withAddress, 'es')).not.toMatch(/[{}]/);
    }
  });
});

describe('foundedLine', () => {
  it('derives the line from the founder and the founding year', () => {
    expect(foundedLine(enEntity, 'en')).toBe(
      'Founded in 2022 by Albert Sabaté',
    );
    expect(foundedLine(enEntity, 'es')).toBe(
      'Fundada en 2022 por Albert Sabaté',
    );
  });

  it('is absent when the entity has no founder', () => {
    expect(foundedLine(esEntity, 'es')).toBeUndefined();
  });
});

describe('taxIdLabel', () => {
  it('joins the scheme and the value', () => {
    expect(taxIdLabel(enEntity)).toBe('UEN 202202371M');
    expect(taxIdLabel(esEntity)).toBe('NIF 47986151D');
  });
});

describe('placeholders', () => {
  it.each([
    'TODO',
    'TODO(albert): x',
    '[X]',
    '[EMAIL_AVISOS_LEADS]',
    '[SPANISH FISCAL ADDRESS: owner provides later]',
    '[LINKEDIN]',
    '[GITHUB]',
    '[GA4_MEASUREMENT_ID]',
    'Lorem ipsum',
    'lorem ipsum',
  ])('matches %s', (text) => {
    expect(text).toMatch(PLACEHOLDER);
  });

  it.each(['todo', 'Todos los días', '[FAQ]', '[Viatsy](https://viatsy.com)'])(
    'does not match %s',
    (text) => {
      expect(text).not.toMatch(PLACEHOLDER);
    },
  );

  it('keeps every content string free of placeholders', async () => {
    const strings = stringsOf([
      enEntity,
      esEntity,
      enCountryNames,
      esCountryNames,
      legalNotice,
      en,
      es,
      await Promise.all(
        locales.flatMap((locale) => [
          buildLlmsTxt(locale),
          buildLlmsFull(locale),
        ]),
      ),
      enLlms,
      esLlms,
      CONTENT,
      enHome,
      esHome,
      enPricing,
      esPricing,
      enAbout,
      esAbout,
      enCases,
      esCases,
      enCompanies,
      esCompanies,
      verifactuDates,
      FAQ,
      SERVICES,
      SERVICE_BODIES,
    ]);
    expect(strings.length).toBeGreaterThan(100);
    expect(strings.filter((text) => PLACEHOLDER.test(text))).toEqual([]);
  });
});

const SERVICE_IDS = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
];

type Row = {
  min: number;
  max?: number;
  qualifier?: 'from';
  unit: 'one-off' | 'month';
};

const BRIEF: Record<string, readonly [Row, Row]> = {
  diagnostic: [
    { min: 3000, unit: 'one-off' },
    { min: 1500, unit: 'one-off' },
  ],
  integration: [
    { min: 8000, qualifier: 'from', unit: 'one-off' },
    { min: 4000, qualifier: 'from', unit: 'one-off' },
  ],
  agent: [
    { min: 15000, max: 35000, unit: 'one-off' },
    { min: 8000, max: 20000, unit: 'one-off' },
  ],
  web: [
    { min: 12000, qualifier: 'from', unit: 'one-off' },
    { min: 6000, qualifier: 'from', unit: 'one-off' },
  ],
  'training-workshop': [
    { min: 2500, qualifier: 'from', unit: 'one-off' },
    { min: 1200, qualifier: 'from', unit: 'one-off' },
  ],
  'training-mentoring': [
    { min: 1200, unit: 'month' },
    { min: 600, unit: 'month' },
  ],
  'maintenance-essential': [
    { min: 500, unit: 'month' },
    { min: 300, unit: 'month' },
  ],
  'maintenance-standard': [
    { min: 1200, unit: 'month' },
    { min: 750, unit: 'month' },
  ],
  'maintenance-extended': [
    { min: 2500, unit: 'month' },
    { min: 1500, unit: 'month' },
  ],
  growth: [
    { min: 1500, qualifier: 'from', unit: 'month' },
    { min: 800, qualifier: 'from', unit: 'month' },
  ],
};

function rowsOf(locale: Locale) {
  return Object.values(SERVICES[locale]).flatMap((service) =>
    service.prices.map((price) => ({ service, price })),
  );
}

describe.each(locales)('services (%s)', (locale) => {
  const services = SERVICES[locale];
  const column = locale === 'en' ? 0 : 1;

  it('lists the ladder in order, keyed by its own id', () => {
    expect(Object.keys(services)).toEqual(SERVICE_IDS);
    for (const [key, service] of Object.entries(services)) {
      expect(service.id).toBe(key);
    }
  });

  it('matches the numbers of the brief', () => {
    expect(rowsOf(locale).map(({ price }) => price.id)).toEqual(
      Object.keys(BRIEF),
    );
    for (const { price } of rowsOf(locale)) {
      const { min, max, qualifier, unit } = price;
      expect({ min, max, qualifier, unit }).toEqual({
        max: undefined,
        qualifier: undefined,
        ...BRIEF[price.id]?.[column],
      });
    }
  });

  it('keeps prices sane and in the locale currency', () => {
    for (const { price } of rowsOf(locale)) {
      expect(Number.isInteger(price.min) && price.min > 0).toBe(true);
      if (price.max !== undefined) {
        expect(price.max).toBeGreaterThan(price.min);
        expect(price.qualifier).toBeUndefined();
      }
      expect(price.currency).toBe(CURRENCY[locale]);
    }
  });

  it('labels every row of a multi-row service unless it is a tier list', () => {
    for (const service of Object.values(services)) {
      if (service.prices.length === 1) continue;
      expect(service.prices.every((price) => price.label)).toBe(true);
    }
  });
});

describe('services across locales', () => {
  it('uses the same row ids per service', () => {
    const rowIds = (locale: Locale) =>
      Object.values(SERVICES[locale]).map((service) =>
        service.prices.map((price) => price.id),
      );
    expect(rowIds('es')).toEqual(rowIds('en'));
  });
});

describe('faq', () => {
  const enIds = FAQ.en.map(({ id }) => id);
  const esIds = FAQ.es.map(({ id }) => id);

  it('has 15 unique English items and the Spanish twin plus verifactu', () => {
    expect(enIds).toHaveLength(15);
    expect(new Set(enIds).size).toBe(15);
    const priceAt = enIds.indexOf('prices');
    expect(esIds).toEqual([
      ...enIds.slice(0, priceAt + 1),
      'verifactu',
      ...enIds.slice(priceAt + 1),
    ]);
  });

  it.each(locales)(
    'writes %s questions and answers of sane length',
    (locale) => {
      for (const item of FAQ[locale]) {
        expect(item.question.endsWith('?')).toBe(true);
        if (locale === 'es') expect(item.question.startsWith('¿')).toBe(true);
        expect(item.answer.length).toBeGreaterThanOrEqual(120);
        expect(item.answer.length).toBeLessThanOrEqual(600);
      }
    },
  );

  it.each(locales)('interpolates the %s prices and the email', (locale) => {
    const faq = FAQ[locale];
    const services = SERVICES[locale];
    const answer = (id: string) => faq.find((item) => item.id === id)?.answer;
    for (const id of ['diagnostic', 'integration', 'agent', 'web'] as const) {
      expect(answer('prices')).toContain(
        formatPriceSummary(locale, services[id].prices),
      );
    }
    expect(answer('start')).toContain(PUBLIC_EMAIL);
  });

  it('writes the Spanish verifactu answer from the dates module', () => {
    const answer = FAQ.es.find(({ id }) => id === 'verifactu')?.answer;
    for (const date of [
      verifactuDates.companies,
      verifactuDates.others,
      verifactuDates.announcedTo,
    ]) {
      expect(answer).toContain(date);
    }
  });
});

describe('typed prices', () => {
  const PRICE_LITERAL = /S\$\s?\d|\d[\d.,]*\s?€/;

  function files(dir: string): string[] {
    return readdirSync(join(process.cwd(), dir), {
      withFileTypes: true,
      recursive: true,
    })
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
      .filter(
        (file) =>
          /\.(ts|tsx|json)$/.test(file) &&
          !/\.test\.tsx?$/.test(file) &&
          !file.endsWith('services.ts'),
      );
  }

  it('scans the service page and hub modules', () => {
    const scanned = files('src/content').map((file) =>
      file.slice(process.cwd().length + 1),
    );
    expect(scanned).toEqual(
      expect.arrayContaining([
        'src/content/en/service-pages/automation.ts',
        'src/content/es/service-pages/training.ts',
        'src/content/en/services-hub.ts',
        'src/content/es/services-hub.ts',
      ]),
    );
    expect(scanned).not.toContain('src/content/en/services.ts');
  });

  it('finds no formatted price outside the services modules', () => {
    const offenders = ['src/content', 'src/components', 'src/i18n'].flatMap(
      (dir) =>
        files(dir).filter((file) =>
          PRICE_LITERAL.test(readFileSync(file, 'utf8')),
        ),
    );
    expect(offenders).toEqual([]);
  });
});

describe('founder', () => {
  it.each(locales)(
    'keeps the %s photo and profiles unset with the Brisa link',
    (locale) => {
      const { founder } = CONTENT[locale];
      expect(founder.photo).toBeNull();
      expect(founder.sameAs).toEqual([]);
      expect(
        founder.bio.flatMap((part) =>
          typeof part === 'string' ? [] : part.href,
        ),
      ).toEqual(['https://brisa.build/']);
    },
  );
});

describe('page bodies across locales', () => {
  const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

  it('shares ids for cases, metrics, problems, steps, principles and story', () => {
    expect(ids(enCases)).toEqual(ids(esCases));
    for (const [index, item] of enCases.entries()) {
      expect(ids(item.metrics)).toEqual(ids(esCases[index]?.metrics ?? []));
      expect(item.automated).toHaveLength(
        esCases[index]?.automated.length ?? -1,
      );
    }
    expect(ids(enHome.problems.items)).toEqual(ids(esHome.problems.items));
    expect(ids(enHome.process.steps)).toEqual(ids(esHome.process.steps));
    expect(ids(enAbout.principles.items)).toEqual(
      ids(esAbout.principles.items),
    );
    expect(ids(enAbout.story)).toEqual(ids(esAbout.story));
    expect(Object.keys(enPricing.details)).toEqual(
      Object.keys(esPricing.details),
    );
    expect(Object.keys(enCompanies)).toEqual(PORTFOLIO.map(({ key }) => key));
    expect(Object.keys(esCompanies)).toEqual(PORTFOLIO.map(({ key }) => key));
  });

  it('leaves the case figures unset or non-negative integers', () => {
    for (const item of [...enCases, ...esCases]) {
      for (const metric of item.metrics) {
        expect(
          metric.value === null ||
            (Number.isInteger(metric.value) && metric.value >= 0),
        ).toBe(true);
      }
    }
  });

  it('gives only the Spanish home a Verifactu strip', () => {
    expect('verifactu' in enHome).toBe(false);
    expect('verifactu' in esHome).toBe(true);
  });
});
