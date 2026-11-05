import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PublishedEntity } from '@/content/types';
import { legalEntity } from '@/lib/content';
import { locales } from '@/lib/i18n';
import { PAGE_IDS, pagePath } from '@/lib/page-registry';
import { PRIVACY_EMAIL, PUBLIC_EMAIL } from '@/lib/site';
import { CONSENT_VERSION } from '@/server/lead-fields';
import { FLIPPED } from '../../../../test/entities';
import { PLACEHOLDER } from '../../../../test/placeholders';
import { CookiesEn } from './cookies-en';
import { CookiesEs } from './cookies-es';
import { LegalNoticeEs } from './legal-notice-es';
import { PrivacyEn } from './privacy-en';
import { PrivacyEs } from './privacy-es';

const SINGAPORE = legalEntity('en');
const SPANISH = legalEntity('es');

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
  `mailto:${PRIVACY_EMAIL}`,
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
const SPANISH_ADDRESS =
  'Carrer Gretel Ammann Martínez, 12, 08020 Barcelona, España';
const CALCULATOR_ES = 'calculadora de presupuesto';
const CALCULATOR_EN = 'price calculator';
const STORAGE_ES = [
  'calendario de Google Workspace',
  'no se incluyen en la invitación',
  'Google Workspace Calendar y Meet',
  'que no llegan a confirmarse: los borramos a los 30 días',
  'Unión Europea',
  '24 meses',
  'acuse de recibo',
  'referente',
  'utm_source',
  'no guardamos nada en tu dispositivo',
  'art. 6.1.f del RGPD',
  'qué versión de la política era',
  'un correo de acuse de recibo',
];
const STORAGE_EN = [
  'Google Workspace calendar',
  'they are not put in the invitation',
  'Google Workspace Calendar and Meet',
  'Booking attempts that are never confirmed: deleted after 30 days',
  'European Union',
  '24 months',
  'acknowledgement email',
  'referrer',
  'utm_source',
  'We do not store anything on your device',
  'GDPR Art. 6(1)(f)',
  'which version of the policy it was',
  'an acknowledgement email',
];
const SINGAPORE_ONLY = ['Pte. Ltd.', 'ACRA', 'PDPA', 'PDPC', 'Singapur'];

const CONFIGURED_EN = [
  '_ga',
  'zenet-consent',
  'zenet-first-touch',
  '13 months',
  '90 days',
  'Attribution (only if you accept)',
  'we set no advertising cookies',
  'Cookie settings',
];
const CONFIGURED_ES = [
  '_ga',
  'zenet-consent',
  'zenet-first-touch',
  '13 meses',
  '90 días',
  'Atribución (solo si la aceptas)',
  'no instalamos cookies publicitarias',
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
  'zenet-first-touch',
  '14 months',
  '14 meses',
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
      'English pages of zenetlabs.com',
      `run by ${SPANISH.legalName}, a sole trader in Spain`,
      'Personal Data Protection Act 2012',
      'Our Data Protection Officer is Dan Lu',
      PRIVACY_EMAIL,
      'Google Asia Pacific Pte. Ltd.',
      'single legal basis under the GDPR',
      'once a month we delete by hand',
      'kept by Resend',
      'Cloudflare D1 Time Travel',
      'section 26',
      'within 30 days',
      'Personal Data Protection Commission (PDPC)',
      'WebMCP',
      ...STORAGE_EN,
    ],
    [...UNCONFIGURED_PRIVACY, CALCULATOR_EN],
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
  [
    'PrivacyEs with the Spanish entity',
    PrivacyEs,
    SPANISH,
    [
      ...SOLE_TRADER,
      SPANISH_ADDRESS,
      'páginas en español de zenetlabs.com',
      'delegado de protección de datos',
      'LOPDGDD',
      'C/ Jorge Juan, 6, 28001 Madrid',
      'art. 21 de la Ley 34/2002',
      'arts. 5.2 y 6.1.c del RGPD',
      'una por finalidad',
      'no es una base jurídica adicional',
      'contrata directamente como encargados del tratamiento',
      'Google Cloud EMEA Limited',
      'una vez al mes borramos a mano',
      'en Resend (contenido, datos de envío y eventos de entrega): 30 días',
      'Time Travel de Cloudflare D1',
      'art. 12.3 del RGPD',
      'art. 22 del RGPD',
      'menores de 14 años',
      'Marco de Privacidad de Datos UE-EE. UU.',
      'Decisión de Ejecución (UE) 2021/914',
      'art. 30 del Código de Comercio',
      'Registros técnicos del servidor: 7 días como máximo',
      'WebMCP',
      ...STORAGE_ES,
    ],
    [...SINGAPORE_ONLY, ...UNCONFIGURED_PRIVACY, CALCULATOR_ES],
  ],
  [
    'CookiesEs with the Spanish entity',
    CookiesEs,
    SPANISH,
    [...SOLE_TRADER, 'art. 22.2 de la Ley 34/2002', '__cf_bm'],
    [...SINGAPORE_ONLY, ...UNCONFIGURED_COOKIES],
  ],
  [
    'LegalNoticeEs with the Spanish entity',
    LegalNoticeEs,
    SPANISH,
    [
      ...SOLE_TRADER,
      SPANISH_ADDRESS,
      'artículo 10 de la Ley 34/2002',
      'Registro Mercantil',
      'código de conducta',
      'juzgados y tribunales de Barcelona',
      'legislación española',
      'no incluyen el IVA',
    ],
    [...SINGAPORE_ONLY, CALCULATOR_ES],
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
    ['PrivacyEn', PrivacyEn, '5 November 2026'],
    ['PrivacyEs', PrivacyEs, '5 de noviembre de 2026'],
  ])('%s is dated like CONSENT_VERSION', (_name, Page, date) => {
    const body = text(<Page title="t" entity={SINGAPORE} />);
    expect(body).toContain(date);
    expect(CONSENT_VERSION).toBe('2026-11-05');
  });
});

const ASSISTANT_EN = [
  'The site assistant',
  'it is an AI system and not a person (Article 50 of the EU AI Act',
  'Cloudflare Workers AI',
  'does not use this content to train models',
  'database in the European Union',
  'do not store your IP address',
  'keyed one-way fingerprint of your IP address',
  'about 51 hours at most',
  'not sent to the AI model',
  'a person reads every booking and enquiry',
  "run the assistant's AI model (Workers AI)",
  'outside the European Union',
  'Assistant conversations: we delete them 30 days after they start',
  'within 24 hours of the start',
  'kept with that enquiry and deleted with it',
];
const ASSISTANT_ES = [
  'El asistente de la web',
  'es un sistema de IA y no una persona (art. 50 del Reglamento',
  'Cloudflare Workers AI',
  'no usa este contenido para entrenar modelos',
  'base de datos en la Unión Europea',
  'no guardamos con ellas tu dirección IP',
  'huella unidireccional con clave de tu dirección IP',
  'unas 51 horas como máximo',
  'no se envían al modelo de IA',
  'una persona lee cada reserva y cada consulta',
  'ejecutar el modelo de IA del asistente (Workers AI)',
  'fuera de la Unión Europea',
  'Conversaciones del asistente: las borramos 30 días después de que empiecen',
  'en las 24 horas siguientes a su inicio',
  'se conserva con esa consulta y se borra con ella',
];

describe('assistant disclosure', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['PrivacyEn', PrivacyEn, ASSISTANT_EN],
    ['PrivacyEs', PrivacyEs, ASSISTANT_ES],
  ])(
    '%s describes the assistant when it is published',
    (_name, Page, expected) => {
      vi.stubGlobal('__ASSISTANT__', true);
      const body = text(<Page title="t" entity={SINGAPORE} />);
      for (const snippet of expected) expect(body).toContain(snippet);
      expect(body).not.toMatch(PLACEHOLDER);
    },
  );

  it.each([
    ['PrivacyEn', PrivacyEn, ASSISTANT_EN],
    ['PrivacyEs', PrivacyEs, ASSISTANT_ES],
  ])(
    '%s says nothing about the assistant while it is dark',
    (_name, Page, forbidden) => {
      vi.stubGlobal('__ASSISTANT__', false);
      const body = text(<Page title="t" entity={SINGAPORE} />);
      expect(body).not.toContain('Workers AI');
      expect(body).not.toContain(forbidden[0]);
    },
  );
});

const VOICE_EN = [
  'Voice calls',
  'the voice you hear is generated by AI',
  'streamed to ElevenLabs (ElevenLabs Inc., United States)',
  "We don't record audio",
  'keeps the text of the conversation for 30 days',
  'a technical record of the call',
  'your time zone and the page',
  "ElevenLabs' conversation id",
  "follow the enquiry's 24 months",
  'ElevenLabs (ElevenLabs Inc., United States), for voice calls',
  'ElevenLabs processes voice calls in the United States',
  'Voice call texts: 30 days at ElevenLabs',
];
const VOICE_ES = [
  'Llamadas de voz',
  'la voz que oirás está generada por IA',
  'se transmite a ElevenLabs (ElevenLabs Inc., Estados Unidos)',
  'No grabamos el audio',
  'guarda el texto de la conversación 30 días',
  'un registro técnico de la llamada',
  'tu zona horaria y la página',
  'la conversación en ElevenLabs',
  'siguen los 24 meses de la consulta',
  'ElevenLabs (ElevenLabs Inc., Estados Unidos), para las llamadas de voz',
  'ElevenLabs trata las llamadas de voz en Estados Unidos',
  'Textos de las llamadas de voz: 30 días en ElevenLabs',
];

describe('voice disclosure', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['PrivacyEn', PrivacyEn, VOICE_EN],
    ['PrivacyEs', PrivacyEs, VOICE_ES],
  ])(
    '%s names ElevenLabs, the transfer and the retention when voice is published',
    (_name, Page, expected) => {
      vi.stubGlobal('__VOICE__', true);
      const body = text(<Page title="t" entity={SINGAPORE} />);
      for (const snippet of expected) expect(body).toContain(snippet);
      expect(body).not.toMatch(PLACEHOLDER);
    },
  );

  it.each([
    ['PrivacyEn', PrivacyEn],
    ['PrivacyEs', PrivacyEs],
  ])('%s says nothing about voice while it is dark', (_name, Page) => {
    vi.stubGlobal('__VOICE__', false);
    const body = text(<Page title="t" entity={SINGAPORE} />);
    expect(body).not.toContain('ElevenLabs');
  });
});

describe('calculator disclosure', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['PrivacyEn', PrivacyEn, CALCULATOR_EN],
    ['PrivacyEs', PrivacyEs, CALCULATOR_ES],
    ['LegalNoticeEs', LegalNoticeEs, CALCULATOR_ES],
  ])(
    '%s mentions the calculator only when it is published',
    (_name, Page, snippet) => {
      vi.stubGlobal('__CALCULATOR__', false);
      expect(text(<Page title="t" entity={SPANISH} />)).not.toContain(snippet);
      vi.stubGlobal('__CALCULATOR__', true);
      expect(text(<Page title="t" entity={SPANISH} />)).toContain(snippet);
    },
  );

  it.each([
    [
      'PrivacyEn',
      PrivacyEn,
      'the address we send to Google Analytics leaves them out',
    ],
    [
      'PrivacyEs',
      PrivacyEs,
      'la dirección que enviamos a Google Analytics las omite',
    ],
  ])(
    '%s says the analytics address drops the answers only when GA is configured',
    (_name, Page, snippet) => {
      vi.stubGlobal('__CALCULATOR__', true);
      vi.stubGlobal('__GA4_ID__', null);
      expect(text(<Page title="t" entity={SPANISH} />)).not.toContain(snippet);
      vi.stubGlobal('__GA4_ID__', 'G-TEST1234');
      expect(text(<Page title="t" entity={SPANISH} />)).toContain(snippet);
    },
  );
});

describe('WebMCP disclosure', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['PrivacyEn', PrivacyEn],
    ['PrivacyEs', PrivacyEs],
  ])('%s says nothing about WebMCP while it is dark', (_name, Page) => {
    vi.stubGlobal('__WEBMCP__', false);
    expect(text(<Page title="t" entity={SPANISH} />)).not.toContain('WebMCP');
  });
});
