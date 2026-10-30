import { describe, expect, it } from 'vitest';
import {
  countryNames as enCountryNames,
  entity as enEntity,
} from '@/content/en/entity';
import {
  countryNames as esCountryNames,
  entity as esEntity,
} from '@/content/es/entity';
import { legalNotice } from '@/content/es/legal-notice';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';
import {
  describeEntity,
  formatAddress,
  foundedLine,
  hasAddress,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { LLMS_TXT } from '@/lib/llms';
import { BARCELONA, FLIPPED } from '../../test/entities';
import { PLACEHOLDER, stringsOf } from '../../test/placeholders';

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

  it('keeps every content string free of placeholders', () => {
    const strings = stringsOf([
      enEntity,
      esEntity,
      enCountryNames,
      esCountryNames,
      legalNotice,
      en,
      es,
      LLMS_TXT,
    ]);
    expect(strings.length).toBeGreaterThan(100);
    expect(strings.filter((text) => PLACEHOLDER.test(text))).toEqual([]);
  });
});
