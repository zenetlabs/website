import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PublishedEntity } from '@/content/types';
import { legalEntity } from '@/lib/content';
import { locales } from '@/lib/i18n';
import { PAGE_IDS, pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { CONSENT_VERSION } from '@/server/lead';
import { FLIPPED } from '../../../../test/entities';
import { PLACEHOLDER } from '../../../../test/placeholders';
import { CookiesEn } from './cookies-en';
import { CookiesEs } from './cookies-es';
import { LegalNoticeEs } from './legal-notice-es';
import { PrivacyEn } from './privacy-en';
import { PrivacyEs } from './privacy-es';

const SINGAPORE = legalEntity('en');

function text(node: React.ReactElement): string {
  return render(node).container.textContent ?? '';
}

function hrefs(node: React.ReactElement): string[] {
  const { container } = render(node);
  return [...container.querySelectorAll('a')].map(
    (a) => a.getAttribute('href') ?? '',
  );
}

const KNOWN_HREFS = new Set([
  `mailto:${PUBLIC_EMAIL}`,
  `${pagePath('es', 'home')}#contact`,
  ...PAGE_IDS.flatMap((page) => locales.map((l) => pagePath(l, page))),
]);

type LegalPageComponent = (props: {
  title: string;
  entity: PublishedEntity;
}) => React.ReactElement;

const SINGAPORE_COMPANY = 'Zenet Technology Pte. Ltd.';
const SINGAPORE_ADDRESS_ES = '160 Robinson Road #14-04, Singapur 068914';
const SOLE_TRADER = ['Albert Sabaté Martínez', 'NIF 47986151D'];
const STORAGE_ES = [
  'Unión Europea',
  '24 meses',
  'acuse de recibo',
  'referente',
  'utm_source',
  'no guardamos nada en tu dispositivo',
  'art. 6.1.f del RGPD',
  'versión de esta política',
  'un correo de acuse de recibo',
];
const STORAGE_EN = [
  'European Union',
  '24 months',
  'acknowledgement email',
  'referrer',
  'utm_source',
  'We do not store anything on your device',
  'GDPR Art. 6(1)(f)',
  'version of this policy you consented to',
  'an acknowledgement email',
];
const SINGAPORE_ONLY = ['Pte. Ltd.', 'ACRA', 'PDPA', 'PDPC', 'Singapur'];

const STATES: ReadonlyArray<
  readonly [
    string,
    LegalPageComponent,
    PublishedEntity,
    readonly string[],
    readonly string[],
  ]
> = [
  [
    'PrivacyEs with Singapore',
    PrivacyEs,
    SINGAPORE,
    [
      SINGAPORE_COMPANY,
      'UEN 202202371M',
      SINGAPORE_ADDRESS_ES,
      'PDPA',
      'PDPC',
      ...STORAGE_ES,
    ],
    [],
  ],
  [
    'CookiesEs with Singapore',
    CookiesEs,
    SINGAPORE,
    [SINGAPORE_COMPANY, 'UEN 202202371M'],
    [],
  ],
  [
    'LegalNoticeEs with Singapore',
    LegalNoticeEs,
    SINGAPORE,
    [
      SINGAPORE_COMPANY,
      'UEN 202202371M',
      SINGAPORE_ADDRESS_ES,
      'ACRA',
      'no incluyen el IVA',
    ],
    [],
  ],
  [
    'PrivacyEn with Singapore',
    PrivacyEn,
    SINGAPORE,
    [
      `${SINGAPORE_COMPANY} (UEN 202202371M)`,
      '160 Robinson Road #14-04, Singapore 068914',
      ...STORAGE_EN,
    ],
    [],
  ],
  [
    'CookiesEn with Singapore',
    CookiesEn,
    SINGAPORE,
    [`${SINGAPORE_COMPANY} (UEN 202202371M)`],
    [],
  ],
  [
    'PrivacyEs with the flipped entity',
    PrivacyEs,
    FLIPPED,
    [
      ...SOLE_TRADER,
      'Calle Ejemplo 1, 08001 Barcelona',
      'autónomo',
      ...STORAGE_ES,
    ],
    SINGAPORE_ONLY,
  ],
  ['CookiesEs with the flipped entity', CookiesEs, FLIPPED, SOLE_TRADER, []],
  [
    'LegalNoticeEs with the flipped entity',
    LegalNoticeEs,
    FLIPPED,
    [
      ...SOLE_TRADER,
      'Calle Ejemplo 1, 08001 Barcelona',
      'autónomo',
      'legislación española',
      'no incluyen el IVA',
    ],
    SINGAPORE_ONLY,
  ],
];

describe.each(STATES)('%s', (_name, Page, entity, expected, forbidden) => {
  const body = text(<Page title="t" entity={entity} />);

  it.each(expected)('contains %s', (snippet) => {
    expect(body).toContain(snippet);
  });

  it.each(forbidden)('does not contain %s', (snippet) => {
    expect(body).not.toContain(snippet);
  });

  it('renders no placeholder', () => {
    expect(body).not.toMatch(PLACEHOLDER);
  });

  it('links only to registry paths', () => {
    for (const href of hrefs(<Page title="t" entity={entity} />)) {
      expect(KNOWN_HREFS.has(href), href).toBe(true);
    }
  });
});

describe('consent version', () => {
  it.each([
    ['PrivacyEn', PrivacyEn, '31 October 2026'],
    ['PrivacyEs', PrivacyEs, '31 de octubre de 2026'],
  ])('%s is dated like CONSENT_VERSION', (_name, Page, date) => {
    const body = text(<Page title="t" entity={SINGAPORE} />);
    expect(body).toContain(date);
    expect(CONSENT_VERSION).toBe('2026-10-31');
  });
});
