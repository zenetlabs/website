import { describe, expect, it } from 'vitest';
import { viatsy as enViatsy } from '@/content/en/cases';
import { viatsy as esViatsy } from '@/content/es/cases';
import { verifactuDates } from '@/content/es/verifactu';
import { crumbName, hubNames } from '@/lib/crumb-names';
import { locales } from '@/lib/i18n';
import { metaOf } from '@/lib/llms';
import { formatMoney, formatPrice, formatPriceSummary } from '@/lib/money';
import {
  HOLDED_PAGE_IDS,
  hasLocale,
  LANDING_PAGE_IDS,
  type LandingPageId,
  PAGES,
} from '@/lib/page-registry';
import { titleText } from '@/lib/title-text';
import { FAQ } from '../../test/faq';
import { HUB, HUB_ES, SPANISH, VIATSY } from '../../test/landing';
import { SERVICES } from '../../test/page-content';
import { PLACEHOLDER, stringsOf } from '../../test/placeholders';
import { SERVICE_BODIES } from '../../test/service-bodies';

const es = SERVICES.es;
const integration = formatPrice('es', es.integration.prices[0]);
const diagnostic = formatPriceSummary('es', es.diagnostic.prices);
const agent = formatPriceSummary('es', es.agent.prices);

function landing(page: LandingPageId) {
  switch (page) {
    case 'verifactu':
      return SPANISH.verifactu;
    case 'travelAgencies':
      return SPANISH.travelAgencies;
    default:
      return SPANISH[page];
  }
}

function ids(list: readonly { id: string }[]): string[] {
  return list.map((item) => item.id);
}

describe('landing page registry and names', () => {
  it('names every page in the hub of the locale that has it', () => {
    for (const page of [...LANDING_PAGE_IDS, 'viatsyCase' as const]) {
      for (const locale of locales) {
        const name = HUB[locale].landing[page];
        if (hasLocale(page, locale)) {
          expect(name?.length, `${page} ${locale}`).toBeGreaterThan(5);
        } else {
          expect(name, `${page} ${locale}`).toBeUndefined();
        }
      }
    }
  });

  it('lists the English hub with the case name only', () => {
    expect(Object.keys(HUB.en.landing)).toEqual(['viatsyCase']);
  });
});

describe('landing page prices', () => {
  it.each(LANDING_PAGE_IDS)(
    '%s quotes the integration price and the tax phrase',
    (page) => {
      const { hero } = landing(page);
      expect(hero.lead).toContain(integration);
      expect(hero.lead).toContain('IVA no incluido');
    },
  );

  it('quotes the agent price on the sector page and the diagnostic on Verifactu', () => {
    expect(SPANISH.travelAgencies.hero.lead).toContain(agent);
    expect(SPANISH.verifactu.hero.lead).toContain(diagnostic);
  });

  it.each(LANDING_PAGE_IDS)(
    '%s starts with the diagnostic at its ladder price',
    (page) => {
      expect(landing(page).facts.start).toContain(diagnostic);
    },
  );

  it('quotes the diagnostic in the small-agency answer and the sanction in euros', () => {
    const small = SPANISH.travelAgencies.faq.items.find(
      (item) => item.id === 'travel-agencies-small',
    );
    expect(small?.answer).toContain(diagnostic);
    const sanctions = SPANISH.verifactu.requirements.items.find(
      (item) => item.id === 'sanctions',
    );
    expect(sanctions?.text).toContain(formatMoney('es', 50000));
  });
});

describe('Verifactu dates', () => {
  const { deadlines, faq, hero } = SPANISH.verifactu;
  const { companies, others, announcedOn, announcedTo, checkedOn } =
    verifactuDates;

  it('takes every date from the shared module', () => {
    expect(hero.lead).toContain(companies);
    expect(hero.lead).toContain(others);
    expect(hero.lead).toContain(announcedTo);
    expect(deadlines.rows.map((row) => row.date)).toEqual([
      `antes del ${companies}`,
      `antes del ${others}`,
    ]);
    expect(deadlines.producers).toContain(verifactuDates.producersFrom);
    expect(deadlines.announced).toContain(announcedOn);
    expect(deadlines.announced).toContain(announcedTo);
    expect(deadlines.checked).toBe(`Fechas revisadas el ${checkedOn}.`);
  });

  it('answers the deadline question with the same dates', () => {
    const answer = faq.items.find(
      (item) => item.id === 'verifactu-deadline',
    )?.answer;
    for (const date of [companies, others, announcedOn, announcedTo]) {
      expect(answer).toContain(date);
    }
  });

  it('keeps the planned order of the deadline rows', () => {
    expect(ids(deadlines.rows)).toEqual(['companies', 'others']);
  });

  it('says the postponement is not in the official gazette yet', () => {
    expect(hero.lead).toContain('aún no está en el BOE');
    expect(deadlines.announced).toContain(
      'Hasta que esa modificación se publique en el BOE',
    );
  });

  it('never calls an adapted program certified nor writes the starred name', () => {
    const strings = stringsOf(SPANISH.verifactu);
    expect(strings.filter((text) => /certificad/i.test(text))).toEqual([]);
    expect(strings.filter((text) => /VERI\*FACTU/i.test(text))).toEqual([]);
  });
});

describe('landing page FAQs', () => {
  const scoped: readonly (readonly [LandingPageId, string, number])[] = [
    ['holdedPrestashop', 'holded-prestashop-', 4],
    ['holdedWoocommerce', 'holded-woocommerce-', 4],
    ['holdedHubspot', 'holded-hubspot-', 4],
    ['verifactu', 'verifactu-', 5],
    ['travelAgencies', 'travel-agencies-', 4],
  ];
  const all = [
    ...FAQ.es,
    ...Object.values(SERVICE_BODIES.es.pages).flatMap((p) => p.faq.items),
    ...scoped.flatMap(([page]) => landing(page).faq.items),
  ];

  it.each(scoped)('%s owns %i-prefixed items', (page, prefix, count) => {
    const { items } = landing(page).faq;
    expect(items).toHaveLength(count);
    for (const item of items) expect(item.id.startsWith(prefix)).toBe(true);
  });

  it('keeps ids, questions and answers unique across home, services and landing pages', () => {
    expect(new Set(all.map((item) => item.id)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.question)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.answer)).size).toBe(all.length);
  });

  it('writes questions and answers of sane length', () => {
    for (const [page] of scoped) {
      for (const { question, answer } of landing(page).faq.items) {
        expect(question).toContain('¿');
        expect(question.endsWith('?')).toBe(true);
        expect(answer.length).toBeGreaterThanOrEqual(120);
        expect(answer.length).toBeLessThanOrEqual(600);
      }
    }
  });
});

describe('primary keywords', () => {
  const KEYWORDS: Record<LandingPageId, string> = {
    holdedPrestashop: 'Holded con PrestaShop',
    holdedWoocommerce: 'Holded con WooCommerce',
    holdedHubspot: 'Holded con HubSpot',
    verifactu: 'Integración con Verifactu',
    travelAgencies: 'Automatización para agencias de viajes',
  };

  it.each(LANDING_PAGE_IDS)(
    'puts the phrase of %s in the H1, the name and the title',
    (page) => {
      const keyword = KEYWORDS[page].toLowerCase();
      expect(titleText(landing(page).hero.title).toLowerCase()).toContain(
        keyword,
      );
      expect(HUB_ES.landing[page]?.toLowerCase()).toContain(keyword);
      expect(
        metaOf('es', page, SERVICE_BODIES.es).title.toLowerCase(),
      ).toContain(keyword);
    },
  );

  it.each([
    ['en', 'Viatsy', 'AI agents'],
    ['es', 'Viatsy', 'agentes de IA'],
  ] as const)(
    'puts Viatsy and the agents phrase in the %s case',
    (locale, name, phrase) => {
      const title = titleText(VIATSY[locale].title);
      expect(title).toContain(name);
      expect(
        `${title} ${metaOf(locale, 'viatsyCase', SERVICE_BODIES[locale]).title}`,
      ).toContain(phrase);
      expect(HUB[locale].landing.viatsyCase).toContain(name);
    },
  );
});

describe('Holded pairs', () => {
  it.each(HOLDED_PAGE_IDS)(
    '%s syncs at least five data kinds between two named tools',
    (page) => {
      const { sync, edgeCases, related } = SPANISH[page];
      expect(sync.rows.length).toBeGreaterThanOrEqual(5);
      expect(new Set(ids(sync.rows)).size).toBe(sync.rows.length);
      for (const row of sync.rows) {
        expect(row.direction).toContain('Holded');
        expect(row.direction).toMatch(/PrestaShop|WooCommerce|HubSpot/);
      }
      expect(edgeCases.items).toHaveLength(6);
      expect(new Set(ids(edgeCases.items)).size).toBe(6);
      expect(related).toContain('integrations');
      expect(related).toContain('verifactu');
      expect(related).not.toContain(page);
      for (const other of HOLDED_PAGE_IDS) {
        if (other !== page) expect(related).toContain(other);
      }
    },
  );
});

describe('related pages', () => {
  it.each(LANDING_PAGE_IDS)(
    '%s relates only existing Spanish pages other than itself',
    (page) => {
      const { related } = landing(page);
      expect(related.length).toBeGreaterThanOrEqual(3);
      expect(related).not.toContain(page);
      for (const target of related) {
        expect(hasLocale(target, 'es'), target).toBe(true);
        expect(crumbName(hubNames(HUB_ES), target).length).toBeGreaterThan(5);
      }
    },
  );
});

describe('Viatsy case', () => {
  const { en, es: spanish } = VIATSY;

  it('shares ids and counts across both locales', () => {
    expect(ids(spanish.facts)).toEqual(ids(en.facts));
    expect(ids(spanish.built.items)).toEqual(ids(en.built.items));
    expect(ids(spanish.operations.steps)).toEqual(ids(en.operations.steps));
    expect(spanish.results.points).toHaveLength(en.results.points.length);
    expect(spanish.problem.paragraphs).toHaveLength(
      en.problem.paragraphs.length,
    );
    expect(en.operations.steps).toHaveLength(4);
  });

  it('publishes once, on the same date, no later than the last modification', () => {
    expect(en.published).toBe(spanish.published);
    expect(en.published).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(en.published <= PAGES.viatsyCase.lastmod).toBe(true);
  });

  it('is linked from both home cases and never states a figure', () => {
    expect(enViatsy.link).toEqual({
      page: 'viatsyCase',
      label: expect.any(String),
    });
    expect(esViatsy.link?.page).toBe('viatsyCase');
    for (const metric of [...enViatsy.metrics, ...esViatsy.metrics]) {
      expect(metric.value).toBeNull();
    }
    for (const copy of [en, spanish]) {
      expect(stringsOf(copy).filter((text) => /\d{2,}\s?%/.test(text))).toEqual(
        [],
      );
    }
  });

  it('says in both languages that the company is our own', () => {
    expect(en.lead).toContain('we own and run');
    expect(spanish.lead).toContain('nuestra');
  });
});

describe('landing page strings', () => {
  it('holds no placeholder or template slot', () => {
    const strings = stringsOf([
      SPANISH,
      VIATSY,
      HUB.en.landing,
      HUB_ES.landing,
    ]);
    expect(strings.length).toBeGreaterThan(200);
    expect(strings.filter((text) => PLACEHOLDER.test(text))).toEqual([]);
    expect(strings.filter((text) => /[{}]/.test(text))).toEqual([]);
    expect(strings.filter((text) => text.includes('*'))).toEqual([]);
  });
});
