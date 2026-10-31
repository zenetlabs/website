import { describe, expect, it } from 'vitest';
import { type Locale, locales, messages } from '@/lib/i18n';
import { metaOf } from '@/lib/llms';
import { formatPrice, formatPriceSummary } from '@/lib/money';
import {
  SERVICE_PAGE_IDS,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { titleText } from '@/lib/title-text';
import { FAQ } from '../../test/faq';
import { SERVICES } from '../../test/page-content';
import { PLACEHOLDER, stringsOf } from '../../test/placeholders';
import { SERVICE_BODIES } from '../../test/service-bodies';

const SERVICE_PAGE_CONTENT = {
  en: SERVICE_BODIES.en.pages,
  es: SERVICE_BODIES.es.pages,
};
const SERVICES_HUB_CONTENT = {
  en: SERVICE_BODIES.en.hub,
  es: SERVICE_BODIES.es.hub,
};

function ids(list: readonly { id: string }[]): string[] {
  return list.map((item) => item.id);
}

const TAX: Record<Locale, string> = {
  en: 'excluding GST',
  es: 'IVA no incluido',
};

describe('service page content parity', () => {
  it.each(locales)('holds exactly the service pages in %s', (locale) => {
    expect(Object.keys(SERVICE_PAGE_CONTENT[locale])).toEqual([
      ...SERVICE_PAGE_IDS,
    ]);
    expect(Object.keys(SERVICES_HUB_CONTENT[locale].cards)).toEqual([
      ...SERVICE_PAGE_IDS,
    ]);
    for (const { name, summary } of Object.values(
      SERVICES_HUB_CONTENT[locale].cards,
    )) {
      expect(name).not.toBe('');
      expect(summary).not.toBe('');
    }
  });

  it.each(SERVICE_PAGE_IDS)('shares the ids of %s across locales', (page) => {
    const en = SERVICE_PAGE_CONTENT.en[page];
    const es = SERVICE_PAGE_CONTENT.es[page];
    expect(ids(es.useCases.items)).toEqual(ids(en.useCases.items));
    expect(ids(es.how.steps)).toEqual(ids(en.how.steps));
    expect(ids(es.faq.items)).toEqual(ids(en.faq.items));
    expect(es.related).toEqual(en.related);
    expect(en.case.points).toHaveLength(es.case.points.length);
  });

  it.each(locales.flatMap((l) => SERVICE_PAGE_IDS.map((p) => [l, p] as const)))(
    'relates two other distinct pages from %s %s',
    (locale, page) => {
      const [first, second] = SERVICE_PAGE_CONTENT[locale][page].related;
      expect(first).not.toBe(second);
      expect([first, second]).not.toContain(page);
    },
  );

  it.each(locales)('gives %s labels and a four-step process', (locale) => {
    expect(
      Object.values(messages[locale].servicePage).every((text) => text !== ''),
    ).toBe(true);
    for (const page of SERVICE_PAGE_IDS) {
      expect(SERVICE_PAGE_CONTENT[locale][page].how.steps).toHaveLength(4);
      expect(SERVICE_PAGE_CONTENT[locale][page].useCases.items).toHaveLength(4);
    }
  });
});

describe.each(locales)('service page prices (%s)', (locale) => {
  const services = SERVICES[locale];
  const diagnostic = formatPriceSummary(locale, services.diagnostic.prices);

  it.each(SERVICE_PAGE_IDS)(
    'quotes the ladder row of %s with the tax phrase',
    (page) => {
      const { hero } = SERVICE_PAGE_CONTENT[locale][page];
      for (const price of services[serviceOf(page)].prices) {
        expect(hero.lead).toContain(formatPrice(locale, price));
      }
      expect(hero.lead).toContain(TAX[locale]);
    },
  );

  it.each(['automation', 'integrations', 'agents', 'software'] as const)(
    'starts %s with the diagnostic at its ladder price',
    (page) => {
      expect(SERVICE_PAGE_CONTENT[locale][page].facts.start).toContain(
        diagnostic,
      );
    },
  );

  it('starts training with a call, not the diagnostic', () => {
    expect(SERVICE_PAGE_CONTENT[locale].training.facts.start).not.toContain(
      diagnostic,
    );
  });

  it('quotes the maintenance plans in the agent running costs', () => {
    const answer = SERVICE_PAGE_CONTENT[locale].agents.faq.items.find(
      (item) => item.id === 'agents-running-costs',
    )?.answer;
    expect(answer).toContain(
      formatPriceSummary(locale, services.maintenance.prices),
    );
  });

  it('quotes the diagnostic on the hub', () => {
    expect(SERVICES_HUB_CONTENT[locale].start.text).toContain(diagnostic);
    expect(SERVICES_HUB_CONTENT[locale].start.text).toContain(TAX[locale]);
  });
});

describe.each(locales)('service page FAQs (%s)', (locale) => {
  const all = [
    ...FAQ[locale],
    ...SERVICE_PAGE_IDS.flatMap(
      (page) => SERVICE_PAGE_CONTENT[locale][page].faq.items,
    ),
  ];

  it.each(SERVICE_PAGE_IDS)('has four items owned by %s', (page) => {
    const { items } = SERVICE_PAGE_CONTENT[locale][page].faq;
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(item.id.startsWith(`${page}-`)).toBe(true);
    }
  });

  it('keeps ids, questions and answers unique across home and services', () => {
    expect(new Set(all.map((item) => item.id)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.question)).size).toBe(all.length);
    expect(new Set(all.map((item) => item.answer)).size).toBe(all.length);
  });

  it('writes questions and answers of sane length', () => {
    for (const { question, answer } of all.slice(FAQ[locale].length)) {
      expect(question.endsWith('?')).toBe(true);
      if (locale === 'es') expect(question.startsWith('¿')).toBe(true);
      expect(answer.length).toBeGreaterThanOrEqual(120);
      expect(answer.length).toBeLessThanOrEqual(600);
    }
  });
});

const KEYWORDS: Record<Locale, Record<ServicePageId | 'services', string>> = {
  en: {
    services: 'AI consulting',
    automation: 'AI automation',
    integrations: 'Xero, Shopify and HubSpot integrations',
    agents: 'AI agent',
    software: 'Custom software development',
    training: 'AI training',
  },
  es: {
    services: 'Consultoría de IA',
    automation: 'Automatización de procesos',
    integrations: 'Integraciones',
    agents: 'agentes de IA',
    software: 'Desarrollo de software a medida',
    training: 'Formación en IA',
  },
};

describe.each(locales)('primary keywords (%s)', (locale) => {
  it.each(SERVICE_PAGE_IDS)(
    'puts the phrase of %s in the H1 and the title',
    (page) => {
      const keyword = KEYWORDS[locale][page].toLowerCase();
      expect(
        titleText(SERVICE_PAGE_CONTENT[locale][page].hero.title).toLowerCase(),
      ).toContain(keyword);
      expect(
        metaOf(locale, page, SERVICE_BODIES[locale]).title.toLowerCase(),
      ).toContain(keyword);
    },
  );

  it('puts the phrase of the hub in the H1 and the title', () => {
    const keyword = KEYWORDS[locale].services.toLowerCase();
    expect(
      titleText(SERVICES_HUB_CONTENT[locale].title).toLowerCase(),
    ).toContain(keyword);
    expect(
      metaOf(locale, 'services', SERVICE_BODIES[locale]).title.toLowerCase(),
    ).toContain(keyword);
  });
});

describe('service page strings', () => {
  it('holds no placeholder or template slot', () => {
    const strings = stringsOf([SERVICE_PAGE_CONTENT, SERVICES_HUB_CONTENT]);
    expect(strings.length).toBeGreaterThan(300);
    expect(strings.filter((text) => PLACEHOLDER.test(text))).toEqual([]);
    expect(strings.filter((text) => /[{}]/.test(text))).toEqual([]);
  });
});
