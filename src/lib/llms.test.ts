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
import { pagesIn } from '@/lib/page-registry';
import { PORTFOLIO } from '@/lib/portfolio';
import { markdownUrl } from '@/lib/seo';
import { FLIPPED } from '../../test/entities';
import { FAQ } from '../../test/faq';
import { SERVICES } from '../../test/page-content';
import { PLACEHOLDER } from '../../test/placeholders';

const LLMS_TXT: Record<Locale, string> = {
  en: buildLlmsTxt('en'),
  es: buildLlmsTxt('es'),
};
const LLMS_FULL: Record<Locale, string> = {
  en: buildLlmsFull('en'),
  es: buildLlmsFull('es'),
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

  it('links every question to its anchor on the home page with its answer', () => {
    const items = section(text, headings.faq);
    const home = locale === 'en' ? '/' : '/es';
    expect(hrefs(items)).toEqual(
      FAQ[locale].map(({ id }) => `https://zenetlabs.com${home}#faq-${id}`),
    );
    for (const [index, item] of FAQ[locale].entries()) {
      expect(items[index]).toContain(item.answer);
    }
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

  it('names the sole trader in Spanish once flipped and leaves English alone', () => {
    const flipped = buildLlmsTxt('es', FLIPPED);
    expect(flipped).toContain(
      'Este sitio lo opera Albert Sabaté Martínez (NIF 47986151D), Calle Ejemplo 1, 08001 Barcelona.',
    );
    expect(buildLlmsTxt('en')).toBe(LLMS_TXT.en);
    expect(buildLlmsFull('es', FLIPPED)).toContain(
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
    expect(await llmsResponse('llms', undefined).text()).toBe(LLMS_TXT.en);
    expect(await llmsResponse('llms', 'es').text()).toBe(LLMS_TXT.es);
    expect(await llmsResponse('llms-full', undefined).text()).toBe(
      LLMS_FULL.en,
    );
    expect(await llmsResponse('llms-full', 'es').text()).toBe(LLMS_FULL.es);
  });

  it.each(['fr', 'en'])('answers 404 for %s', async (param) => {
    const response = llmsResponse('llms', param);
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8',
    );
  });

  it('sends the plain text, cache and noindex headers', () => {
    const { headers, status } = llmsResponse('llms', undefined);
    expect(status).toBe(200);
    expect(headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(headers.get('X-Robots-Tag')).toBe('noindex');
  });
});
