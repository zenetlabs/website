import { describe, expect, it } from 'vitest';
import { aboutPage as enAbout } from '@/content/en/about';
import { home as enHome } from '@/content/en/home';
import { llms as enLlms } from '@/content/en/llms';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { aboutPage as esAbout } from '@/content/es/about';
import { home as esHome } from '@/content/es/home';
import { llms as esLlms } from '@/content/es/llms';
import { pricingPage as esPricing } from '@/content/es/pricing';
import type {
  HomeContent,
  LlmsCopy,
  PricingPageContent,
} from '@/content/types';
import { CONTENT, legalEntity } from '@/lib/content';
import { type Locale, locales, messages } from '@/lib/i18n';
import { buildLlmsFull, buildLlmsTxt, llmsResponse } from '@/lib/llms';
import { formatPrice, formatPriceSummary } from '@/lib/money';
import {
  HOLDED_PAGE_IDS,
  hasLocale,
  LANDING_PAGE_IDS,
  pagesIn,
  SERVICE_PAGE_IDS,
  serviceOf,
} from '@/lib/page-registry';
import { PORTFOLIO } from '@/lib/portfolio';
import { markdownUrl, pageUrl } from '@/lib/seo';
import { titleText } from '@/lib/title-text';
import { FLIPPED } from '../../test/entities';
import { FAQ } from '../../test/faq';
import { SERVICES } from '../../test/page-content';
import { PLACEHOLDER } from '../../test/placeholders';
import { SERVICE_BODIES } from '../../test/service-bodies';

const LLMS_TXT: Record<Locale, string> = {
  en: await buildLlmsTxt('en'),
  es: await buildLlmsTxt('es'),
};
const LLMS_FULL: Record<Locale, string> = {
  en: await buildLlmsFull('en'),
  es: await buildLlmsFull('es'),
};
const LINK = /^- \[[^\]]+\]\((https?:\/\/|mailto:)[^)]+\)(: .+)?$/;
const LEFTOVER = /\{[a-zA-Z]+\}|undefined|null|\[object Object\]/;
const COPY: Record<Locale, LlmsCopy> = { en: enLlms, es: esLlms };
const ABOUT = { en: enAbout, es: esAbout };
const HOME: Record<Locale, HomeContent> = { en: enHome, es: esHome };
const PRICING: Record<Locale, PricingPageContent> = {
  en: enPricing,
  es: esPricing,
};

function landingFaqOf(locale: Locale) {
  const { spanish } = SERVICE_BODIES[locale].landing;
  if (!spanish) return [];
  return [
    ...HOLDED_PAGE_IDS.map((page) => [page, spanish[page]] as const),
    ['verifactu', spanish.verifactu] as const,
    ['travelAgencies', spanish.travelAgencies] as const,
  ].flatMap(([page, copy]) =>
    copy.faq.items.map((item) => ({ item, page: pageUrl(locale, page) })),
  );
}

function linesOf(text: string): string[] {
  return text.split('\n');
}

function section(text: string, heading: string): string[] {
  const lines = linesOf(text);
  const rest = lines.slice(lines.indexOf(`## ${heading}`) + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).filter(Boolean);
}

function hrefs(items: string[]): string[] {
  return items.flatMap((line) => /\]\(([^)]+)\)/.exec(line)?.[1] ?? []);
}

function h2(text: string): string[] {
  return linesOf(text).filter((line) => line.startsWith('## '));
}

describe.each(locales)('LLMS_TXT %s', (locale) => {
  const text = LLMS_TXT[locale];
  const copy = COPY[locale];
  const { headings } = copy;

  it('opens with the title and the description quote and ends with a newline', () => {
    expect(
      text.startsWith(
        `# Zenet Labs\n\n> ${messages[locale].meta.description}\n`,
      ),
    ).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('orders the sections', () => {
    expect(h2(text)).toEqual(
      [
        headings.services,
        headings.pages,
        headings.faq,
        headings.portfolio,
        headings.contact,
        'Optional',
      ].map((heading) => `## ${heading}`),
    );
  });

  it('writes every list line as a link', () => {
    const items = linesOf(text)
      .slice(linesOf(text).findIndex((line) => line.startsWith('## ')))
      .filter((line) => line.startsWith('- '));
    expect(items.filter((line) => !LINK.test(line))).toEqual([]);
  });

  it('lists the markdown url of every page of the locale', () => {
    expect(hrefs(section(text, headings.pages))).toEqual(
      pagesIn(locale).map((page) => markdownUrl(locale, page)),
    );
  });

  it('lists every service with its price on the pricing page', () => {
    const items = section(text, headings.services);
    const services = Object.values(SERVICES[locale]);
    expect(hrefs(items)).toEqual(
      services.map(
        ({ id }) =>
          `https://zenetlabs.com${locale === 'en' ? '/pricing' : '/es/precios'}#${id}`,
      ),
    );
    for (const [index, service] of services.entries()) {
      expect(items[index]).toContain(
        formatPriceSummary(locale, service.prices),
      );
    }
  });

  it('links every question to its anchor on its page with its answer', () => {
    const items = section(text, headings.faq);
    const home = locale === 'en' ? '/' : '/es';
    const entries = [
      ...FAQ[locale].map((item) => ({
        item,
        page: `https://zenetlabs.com${home}`,
      })),
      ...SERVICE_PAGE_IDS.flatMap((page) =>
        SERVICE_BODIES[locale].pages[page].faq.items.map((item) => ({
          item,
          page: pageUrl(locale, page),
        })),
      ),
      ...landingFaqOf(locale),
    ];
    expect(items).toHaveLength(locale === 'en' ? 35 : 57);
    expect(hrefs(items)).toEqual(
      entries.map(({ item, page }) => `${page}#faq-${item.id}`),
    );
    for (const [index, { item }] of entries.entries()) {
      expect(items[index]).toContain(item.answer);
    }
  });

  it('links the service pages first among the commercial pages', () => {
    const pages = hrefs(section(text, headings.pages));
    expect(pages).toHaveLength(locale === 'en' ? 12 : 18);
    expect(pages.slice(1, 7)).toEqual([
      markdownUrl(locale, 'services'),
      ...SERVICE_PAGE_IDS.map((page) => markdownUrl(locale, page)),
    ]);
    expect(pages.slice(7, 7 + (locale === 'en' ? 1 : 6))).toEqual(
      [...LANDING_PAGE_IDS, 'viatsyCase' as const]
        .filter((page) => hasLocale(page, locale))
        .map((page) => markdownUrl(locale, page)),
    );
  });

  it('lists the portfolio and the contact address', () => {
    expect(hrefs(section(text, headings.portfolio))).toEqual(
      PORTFOLIO.map((p) => p.href),
    );
    expect(text).toContain('mailto:hello@zenetlabs.com');
  });

  it('links the full text and the other language under Optional', () => {
    const other = locale === 'en' ? 'es' : 'en';
    expect(hrefs(section(text, 'Optional'))).toEqual([
      `https://zenetlabs.com${locale === 'en' ? '' : '/es'}/llms-full.txt`,
      `https://zenetlabs.com${other === 'en' ? '' : '/es'}/llms.txt`,
    ]);
  });

  it('leaves no placeholder or stray token', () => {
    expect(text).not.toMatch(LEFTOVER);
    expect(text).not.toMatch(PLACEHOLDER);
  });
});

describe('LLMS_TXT operator', () => {
  it('names the Singapore company in English', () => {
    const operator = legalEntity('en');
    expect(LLMS_TXT.en).toContain(
      `This site is operated by ${operator.legalName} (UEN ${operator.taxId.value}), 160 Robinson Road #14-04, Singapore 068914.`,
    );
  });

  it('names the same company in Spanish while the entity is unflipped', () => {
    const operator = legalEntity('en');
    expect(LLMS_TXT.es).toContain(
      `Este sitio lo opera ${operator.legalName} (UEN ${operator.taxId.value}), 160 Robinson Road #14-04,`,
    );
  });

  it('names the sole trader in Spanish once flipped and leaves English alone', async () => {
    const flipped = await buildLlmsTxt('es', FLIPPED);
    expect(flipped).toContain(
      'Este sitio lo opera Albert Sabaté Martínez (NIF 47986151D), Calle Ejemplo 1, 08001 Barcelona.',
    );
    expect(await buildLlmsTxt('en')).toBe(LLMS_TXT.en);
    expect(await buildLlmsFull('es', FLIPPED)).toContain(
      'Este sitio lo opera Albert Sabaté Martínez (NIF 47986151D)',
    );
  });
});

describe.each(locales)('LLMS_FULL %s', (locale) => {
  const text = LLMS_FULL[locale];
  const copy = COPY[locale];
  const { headings } = copy;

  it('opens like the index and points at it', () => {
    expect(
      text.startsWith(
        `# Zenet Labs\n\n> ${messages[locale].meta.description}\n`,
      ),
    ).toBe(true);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain(
      `https://zenetlabs.com${locale === 'en' ? '' : '/es'}/llms.txt;`,
    );
  });

  it('lists every price row, include item and timeline', () => {
    for (const service of Object.values(SERVICES[locale])) {
      expect(text).toContain(`### [${service.name}](`);
      expect(text).toContain(service.summary);
      for (const price of service.prices) {
        expect(text).toContain(formatPrice(locale, price));
      }
    }
    const { details } = PRICING[locale];
    for (const { includes, timeline } of Object.values(details)) {
      for (const item of includes) expect(text).toContain(`- ${item}`);
      if (timeline) expect(text).toContain(timeline);
    }
  });

  it('writes every question as a heading with its answer', () => {
    for (const { question, answer } of FAQ[locale]) {
      expect(text).toContain(`### ${question}\n\n${answer}\n`);
    }
  });

  it('describes every service page with its price and FAQ', () => {
    const body = section(text, headings.servicePages);
    const { hub } = SERVICE_BODIES[locale];
    const labels = SERVICE_BODIES[locale].hub.labels;
    expect(text).toContain(`${titleText(hub.title)}. ${hub.lead}`);
    expect(body.filter((line) => line.startsWith('### ['))).toEqual(
      SERVICE_PAGE_IDS.map(
        (page) => `### [${hub.cards[page].name}](${pageUrl(locale, page)})`,
      ),
    );
    expect(body.filter((line) => line.startsWith('#### '))).toHaveLength(20);
    for (const page of SERVICE_PAGE_IDS) {
      const copyOf = SERVICE_BODIES[locale].pages[page];
      const prices = SERVICES[locale][serviceOf(page)].prices;
      expect(text).toContain(copyOf.hero.lead);
      expect(text).toContain(
        `- ${labels.price}: ${formatPriceSummary(locale, prices)} (${labels.taxNote})`,
      );
      expect(text).toContain(`- ${labels.timeline}: ${copyOf.facts.timeline}`);
      for (const item of copyOf.useCases.items) {
        expect(text).toContain(`- ${item.title}: ${item.text}`);
      }
      for (const [index, step] of copyOf.how.steps.entries()) {
        expect(text).toContain(`${index + 1}. ${step.label}: ${step.text}`);
      }
      for (const { question, answer } of copyOf.faq.items) {
        expect(text).toContain(`#### ${question}\n\n${answer}\n`);
      }
    }
  });

  it('describes the case page in both languages', () => {
    const { viatsy } = SERVICE_BODIES[locale].landing;
    const cases = section(text, headings.cases).join('\n');
    expect(text).toContain(
      `[${SERVICE_BODIES[locale].hub.landing.viatsyCase}](${pageUrl(locale, 'viatsyCase')})`,
    );
    expect(cases).toContain(`#### ${titleText(viatsy.problem.title)}`);
    for (const paragraph of viatsy.problem.paragraphs) {
      expect(text).toContain(paragraph);
    }
    for (const item of viatsy.built.items) {
      expect(text).toContain(`- ${item.title}: ${item.text}`);
    }
    for (const [index, step] of viatsy.operations.steps.entries()) {
      expect(text).toContain(`${index + 1}. ${step.label}: ${step.text}`);
    }
    for (const point of viatsy.results.points) {
      expect(text).toContain(`- ${point}`);
    }
  });

  it('holds the about copy, the founder and every company', () => {
    const about = ABOUT[locale];
    expect(text).toContain(about.lead);
    expect(text).toContain(about.vision.text);
    for (const item of about.principles.items) {
      expect(text).toContain(`- ${item.title}: ${item.text}`);
    }
    expect(text).toContain(CONTENT[locale].founder.name);
    expect(text).toContain('[Brisa](https://brisa.build/)');
    for (const { href } of PORTFOLIO) expect(text).toContain(`](${href})`);
  });

  it('lists every page markdown url and the mailto', () => {
    for (const page of pagesIn(locale)) {
      expect(text).toContain(markdownUrl(locale, page));
    }
    expect(text).toContain('mailto:hello@zenetlabs.com');
  });

  it('holds every case, problem and process step', () => {
    const { cases, problems, process } = HOME[locale];
    for (const item of cases.items) {
      expect(text).toContain(item.context);
      for (const line of item.automated) expect(text).toContain(`- ${line}`);
    }
    for (const item of problems.items) {
      expect(text).toContain(`### ${item.title}\n\n${item.problem}`);
      expect(text).toContain(`${problems.fixLabel}: ${item.fix}`);
    }
    for (const step of process.steps) {
      expect(text).toContain(`### ${step.label}\n\n${step.text}`);
    }
  });

  it('leaves out the label of every metric without a value', () => {
    const unmeasured = HOME[locale].cases.items
      .flatMap((item) => item.metrics)
      .filter((metric) => metric.value === null);
    expect(unmeasured.length).toBeGreaterThan(0);
    for (const metric of unmeasured) expect(text).not.toContain(metric.label);
  });

  it('holds the copy headings in order', () => {
    const order = [
      headings.pricing,
      headings.servicePages,
      ...(locale === 'es' ? [headings.holded] : []),
      headings.problems,
      headings.process,
      headings.cases,
      headings.about,
      headings.portfolio,
      headings.faq,
      headings.contact,
      headings.pages,
      'Optional',
    ];
    const found = h2(text).filter((heading) =>
      order.includes(heading.slice(3)),
    );
    expect(found).toEqual(order.map((heading) => `## ${heading}`));
  });

  it('leaves no placeholder or stray token', () => {
    expect(text).not.toMatch(LEFTOVER);
    expect(text).not.toMatch(PLACEHOLDER);
  });
});

describe('LLMS_FULL Spanish landing pages', () => {
  const text = LLMS_FULL.es;
  const bodies = SERVICE_BODIES.es;
  const { spanish } = bodies.landing;
  const labels = bodies.hub.labels;

  it('describes each Holded pair with its price, table, edge cases and FAQ', () => {
    const body = section(text, esLlms.headings.holded);
    expect(body.filter((line) => line.startsWith('### ['))).toEqual(
      HOLDED_PAGE_IDS.map(
        (page) => `### [${bodies.hub.landing[page]}](${pageUrl('es', page)})`,
      ),
    );
    expect(body.filter((line) => line.startsWith('#### '))).toHaveLength(12);
    for (const page of HOLDED_PAGE_IDS) {
      const pair = spanish?.[page];
      expect(pair).toBeDefined();
      if (!pair) continue;
      expect(text).toContain(pair.hero.lead);
      expect(text).toContain(
        `- ${labels.price}: ${formatPriceSummary('es', SERVICES.es.integration.prices)} (${labels.taxNote})`,
      );
      for (const row of pair.sync.rows) {
        expect(text).toContain(`- ${row.data}: ${row.direction}. ${row.when}`);
      }
      expect(text).toContain(pair.sync.note);
      for (const item of pair.edgeCases.items) {
        expect(text).toContain(`- ${item.title}: ${item.text}`);
      }
      for (const { question, answer } of pair.faq.items) {
        expect(text).toContain(`#### ${question}\n\n${answer}\n`);
      }
    }
  });

  it('holds the Verifactu page with its checked dates inside the home section', () => {
    const verifactu = spanish?.verifactu;
    expect(verifactu).toBeDefined();
    if (!verifactu) return;
    const body = section(
      text,
      'Que cada venta genere su factura, y que cumpla',
    );
    expect(body.join('\n')).toContain(
      `### [${bodies.hub.landing.verifactu}](${pageUrl('es', 'verifactu')})`,
    );
    for (const row of verifactu.deadlines.rows) {
      expect(text).toContain(`- ${row.who}: ${row.date}`);
    }
    expect(text).toContain(verifactu.deadlines.announced);
    expect(text).toContain(verifactu.deadlines.checked);
    expect(text).toContain(verifactu.disclaimer);
    for (const item of verifactu.requirements.items) {
      expect(text).toContain(`- ${item.title}: ${item.text}`);
    }
    for (const { question, answer } of verifactu.faq.items) {
      expect(text).toContain(`#### ${question}\n\n${answer}\n`);
    }
  });

  it('holds the travel-agency page after the cases', () => {
    const sector = spanish?.travelAgencies;
    expect(sector).toBeDefined();
    if (!sector) return;
    const heading = `## [${bodies.hub.landing.travelAgencies}](${pageUrl('es', 'travelAgencies')})`;
    expect(h2(text)).toContain(heading);
    expect(h2(text).indexOf(heading)).toBe(
      h2(text).indexOf(`## ${esLlms.headings.cases}`) + 1,
    );
    expect(text).toContain(sector.hero.lead);
    for (const item of sector.work.items) {
      expect(text).toContain(
        `- ${item.title}: ${item.today} → ${item.automated}`,
      );
    }
    for (const { question, answer } of sector.faq.items) {
      expect(text).toContain(`#### ${question}\n\n${answer}\n`);
    }
  });

  it('keeps the English file free of the Spanish landing pages', () => {
    expect(LLMS_FULL.en).not.toContain(enLlms.headings.holded);
    expect(LLMS_FULL.en).not.toContain('holded-prestashop');
    expect(LLMS_FULL.en).not.toContain('agencias-de-viaje');
  });
});

describe('LLMS_FULL scope', () => {
  it('has the Verifactu section only in Spanish', () => {
    expect(h2(LLMS_FULL.es)).toContain(
      '## Que cada venta genere su factura, y que cumpla',
    );
    expect(LLMS_FULL.es).toContain('Reglamento Verifactu');
    expect(LLMS_FULL.en).not.toContain('Verifactu');
  });

  it('leaves out the legal prose', () => {
    expect(LLMS_FULL.en).not.toContain('ACRA');
    expect(LLMS_FULL.en).not.toContain('PDPC');
  });
});

describe('llmsResponse', () => {
  it('serves the default locale without a param and es with es', async () => {
    expect(await (await llmsResponse('llms', undefined)).text()).toBe(
      LLMS_TXT.en,
    );
    expect(await (await llmsResponse('llms', 'es')).text()).toBe(LLMS_TXT.es);
    expect(await (await llmsResponse('llms-full', undefined)).text()).toBe(
      LLMS_FULL.en,
    );
    expect(await (await llmsResponse('llms-full', 'es')).text()).toBe(
      LLMS_FULL.es,
    );
  });

  it.each(['fr', 'en'])('answers 404 for %s', async (param) => {
    const response = await llmsResponse('llms', param);
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8',
    );
  });

  it('sends the plain text, cache and noindex headers', async () => {
    const { headers, status } = await llmsResponse('llms', undefined);
    expect(status).toBe(200);
    expect(headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
