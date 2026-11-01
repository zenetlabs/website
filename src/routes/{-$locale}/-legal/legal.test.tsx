import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PublishedEntity } from '@/content/types';
import { legalEntity } from '@/lib/content';
import { locales } from '@/lib/i18n';
import { PAGE_IDS, pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { CONSENT_VERSION } from '@/server/lead-fields';
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
  'calendario de Google Workspace',
  'no se incluyen en la invitación',
  'Google Workspace Calendar y Meet cuando reservas una llamada',
  'a los 30 días los intentos de reserva sin confirmar',
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
  'Google Workspace calendar',
  'they are not put in the invitation',
  'Google Workspace Calendar and Meet when you book a call',
  'Unconfirmed booking attempts are deleted after 30 days',
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

const CONFIGURED_EN = [
  '_ga',
  'zenet-consent',
  'zenet-first-touch',
  '13 months',
  '90 days',
  'Cookie settings',
];
const CONFIGURED_ES = [
  '_ga',
  'zenet-consent',
  'zenet-first-touch',
  '13 meses',
  '90 días',
  'Configuración de cookies',
];
const UNCONFIGURED_COOKIES = [
  '_ga',
  'zenet-consent',
  'zenet-first-touch',
  'Google Analytics',
  'Cookie settings',
  'Configuración de cookies',
];
const UNCONFIGURED_PRIVACY = [
  'Google Analytics',
  'Google Ireland Limited y Google LLC), para Google Analytics',
  'Google Ireland Limited and Google LLC), for Google Analytics',
  'Data Privacy Framework',
  'Marco de Privacidad de Datos',
  'zenet-first-touch',
  'Cookie settings',
  'Configuración de cookies',
];

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
    UNCONFIGURED_PRIVACY,
  ],
  [
    'CookiesEs with Singapore',
    CookiesEs,
    SINGAPORE,
    [
      SINGAPORE_COMPANY,
      'UEN 202202371M',
      'No usamos cookies analíticas ni publicitarias',
    ],
    UNCONFIGURED_COOKIES,
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
    UNCONFIGURED_PRIVACY,
  ],
  [
    'CookiesEn with Singapore',
    CookiesEn,
    SINGAPORE,
    [
      `${SINGAPORE_COMPANY} (UEN 202202371M)`,
      'We do not use analytics or advertising cookies',
    ],
    UNCONFIGURED_COOKIES,
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
    [...SINGAPORE_ONLY, ...UNCONFIGURED_PRIVACY],
  ],
  [
    'CookiesEs with the flipped entity',
    CookiesEs,
    FLIPPED,
    SOLE_TRADER,
    UNCONFIGURED_COOKIES,
  ],
];

function checkPages(states: typeof STATES, gaId: string | null) {
  describe.each(states)('%s', (_name, Page, entity, expected, forbidden) => {
    let body = '';

    beforeAll(() => {
      vi.stubGlobal('__GA4_ID__', gaId);
      body = text(<Page title="t" entity={entity} />);
    });

    afterAll(() => {
      vi.unstubAllGlobals();
    });

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
}

const CONFIGURED_STATES: typeof STATES = [
  [
    'CookiesEn with analytics configured',
    CookiesEn,
    SINGAPORE,
    CONFIGURED_EN,
    ['We do not use analytics or advertising cookies'],
  ],
  [
    'CookiesEs with analytics configured',
    CookiesEs,
    SINGAPORE,
    CONFIGURED_ES,
    ['No usamos cookies analíticas ni publicitarias'],
  ],
  [
    'CookiesEs with analytics configured and the flipped entity',
    CookiesEs,
    FLIPPED,
    [...SOLE_TRADER, ...CONFIGURED_ES, 'art. 22.2 de la LSSI'],
    SINGAPORE_ONLY,
  ],
  [
    'PrivacyEn with analytics configured',
    PrivacyEn,
    SINGAPORE,
    [
      ...STORAGE_EN.filter((snippet) => !snippet.startsWith('We do not store')),
      'Google Analytics',
      'Google Ireland Limited',
      'Data Privacy Framework',
      '14 months',
      '90 days',
      'Cookie settings',
    ],
    ['We do not store anything on your device', 'no tracking pixels'],
  ],
  [
    'PrivacyEs with analytics configured',
    PrivacyEs,
    SINGAPORE,
    [
      ...STORAGE_ES.filter((snippet) => !snippet.startsWith('no guardamos')),
      'Google Analytics',
      'Google Ireland Limited',
      'Marco de Privacidad de Datos',
      '14 meses',
      '90 días',
      'Configuración de cookies',
    ],
    ['Para ello no guardamos nada en tu dispositivo', 'ni píxeles'],
  ],
  [
    'PrivacyEs with analytics configured and the flipped entity',
    PrivacyEs,
    FLIPPED,
    [...SOLE_TRADER, 'Google Ireland Limited', 'art. 22.2 de la LSSI'],
    SINGAPORE_ONLY,
  ],
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

checkPages(STATES, null);
checkPages(CONFIGURED_STATES, 'G-TEST1234');

describe('consent version', () => {
  it.each([
    ['PrivacyEn', PrivacyEn, '1 November 2026'],
    ['PrivacyEs', PrivacyEs, '1 de noviembre de 2026'],
  ])('%s is dated like CONSENT_VERSION', (_name, Page, date) => {
    const body = text(<Page title="t" entity={SINGAPORE} />);
    expect(body).toContain(date);
    expect(CONSENT_VERSION).toBe('2026-11-01');
  });
});
