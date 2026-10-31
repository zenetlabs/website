import { aboutPage as enAbout } from '@/content/en/about';
import { faq as enFaq } from '@/content/en/faq';
import { home as enHome } from '@/content/en/home';
import { llms as enLlms } from '@/content/en/llms';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { services as enServices } from '@/content/en/services';
import { aboutPage as esAbout } from '@/content/es/about';
import { faq as esFaq } from '@/content/es/faq';
import { home as esHome } from '@/content/es/home';
import { llms as esLlms } from '@/content/es/llms';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { services as esServices } from '@/content/es/services';
import type {
  AboutPageContent,
  FaqItem,
  HomeContent,
  LlmsCopy,
  Metric,
  PricingPageContent,
  PublishedEntity,
  Rich,
  Services,
  TitleParts,
} from '@/content/types';
import {
  CONTENT,
  describeEntity,
  foundedLine,
  legalEntity,
} from '@/lib/content';
import {
  type Locale,
  localeFromParam,
  localePath,
  messages,
  otherLocale,
} from '@/lib/i18n';
import { formatNumber, formatPrice, formatPriceSummary } from '@/lib/money';
import { pagesIn } from '@/lib/page-registry';
import { pageCopy } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';
import { markdownUrl, pageUrl, SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';

type Bodies = {
  home: HomeContent;
  pricing: PricingPageContent;
  about: AboutPageContent;
  services: Services;
  faq: readonly FaqItem[];
  copy: LlmsCopy;
};

const BODIES: Record<Locale, Bodies> = {
  en: {
    home: enHome,
    pricing: enPricing,
    about: enAbout,
    services: enServices,
    faq: enFaq,
    copy: enLlms,
  },
  es: {
    home: esHome,
    pricing: esPricing,
    about: esAbout,
    services: esServices,
    faq: esFaq,
    copy: esLlms,
  },
};

type MeasuredMetric = Metric & { value: number };

function isMeasured(metric: Metric): metric is MeasuredMetric {
  return metric.value !== null;
}

function titleText({ before, emphasis, after }: TitleParts): string {
  return `${before}${emphasis}${after}`;
}

function richText(rich: Rich): string {
  return rich
    .map((part) => {
      if (typeof part === 'string') return part;
      const href = part.href.startsWith('/')
        ? `${SITE.url}${part.href}`
        : part.href;
      return `[${part.text}](${href})`;
    })
    .join('');
}

type LlmsFile = 'llms' | 'llms-full';

function llmsUrl(locale: Locale, file: LlmsFile): string {
  return `${SITE.url}${localePath(locale, `/${file}.txt`)}`;
}

function intro(locale: Locale, entity: PublishedEntity, note?: string): string {
  const { copy } = BODIES[locale];
  const founded = foundedLine(entity, locale);
  return [
    describeEntity(copy.operator, entity, locale),
    ...(founded ? [`${founded}.`] : []),
    copy.markdown.replace('{home}', markdownUrl(locale, 'home')),
    ...(note ? [note] : []),
  ].join(' ');
}

function doc(blocks: readonly string[]): string {
  return `${blocks.join('\n\n')}\n`;
}

function preamble(
  locale: Locale,
  entity: PublishedEntity,
  note?: string,
): string[] {
  return [
    `# ${SITE_NAME}\n\n> ${messages[locale].meta.description}`,
    intro(locale, entity, note),
  ];
}

function section(
  heading: string,
  lines: readonly string[],
  gap = '\n',
): string {
  return [`## ${heading}`, ...lines].join(gap);
}

function optional(locale: Locale, self: LlmsFile): string {
  const { labels } = BODIES[locale].copy;
  const sibling = self === 'llms' ? 'llms-full' : 'llms';
  return section('Optional', [
    `- [${self === 'llms' ? labels.full : labels.index}](${llmsUrl(locale, sibling)})`,
    `- [${labels.otherLanguage}](${llmsUrl(otherLocale(locale), self)})`,
  ]);
}

function pagesLines(locale: Locale): string[] {
  return pagesIn(locale).map((page) => {
    const { title, description } = pageCopy(locale, page);
    return `- [${title}](${markdownUrl(locale, page)}): ${description}`;
  });
}

function faqLines(locale: Locale): string[] {
  const home = pageUrl(locale, 'home');
  return BODIES[locale].faq.map(
    ({ id, question, answer }) =>
      `- [${question}](${home}#faq-${id}): ${answer}`,
  );
}

function portfolioLines(locale: Locale): string[] {
  const { items } = BODIES[locale].home.companies;
  return PORTFOLIO.map(
    ({ key, name, href }) =>
      `- [${name}](${href}): ${items[key].description} (${items[key].category})`,
  );
}

function contactLines(locale: Locale): string[] {
  const { home, copy } = BODIES[locale];
  return [
    `- [${copy.labels.email}](mailto:${PUBLIC_EMAIL}): ${home.contact.human}`,
    `- [${copy.labels.form}](${pageUrl(locale, 'home')}#contact): ${home.contact.lead}`,
  ];
}

export function buildLlmsTxt(
  locale: Locale,
  entity: PublishedEntity = legalEntity(locale),
): string {
  const { services, copy } = BODIES[locale];
  const pricing = pageUrl(locale, 'pricing');
  return doc([
    ...preamble(locale, entity),
    section(
      copy.headings.services,
      Object.values(services).map(
        (service) =>
          `- [${service.name}](${pricing}#${service.id}): ${formatPriceSummary(locale, service.prices)}. ${service.summary}`,
      ),
    ),
    section(copy.headings.pages, pagesLines(locale)),
    section(copy.headings.faq, faqLines(locale)),
    section(copy.headings.portfolio, portfolioLines(locale)),
    section(copy.headings.contact, contactLines(locale)),
    optional(locale, 'llms'),
  ]);
}

function pricingSection(locale: Locale): string {
  const { pricing, services, copy } = BODIES[locale];
  const url = pageUrl(locale, 'pricing');
  return section(
    copy.headings.pricing,
    [
      `${pricing.lead} ${pricing.taxNote}`,
      ...Object.values(services).flatMap((service) => {
        const { includes, timeline } = pricing.details[service.id];
        return [
          `### [${service.name}](${url}#${service.id})`,
          service.summary,
          service.prices
            .map(
              (price) =>
                `- ${price.label ?? pricing.labels.price}: ${formatPrice(locale, price)}${price.note ? ` (${price.note})` : ''}`,
            )
            .join('\n'),
          [
            `${pricing.labels.includes}:`,
            ...includes.map((item) => `- ${item}`),
          ].join('\n'),
          ...(timeline ? [`${pricing.labels.timeline}: ${timeline}`] : []),
        ];
      }),
      `### ${pricing.how.title}`,
      pricing.how.items.map((item) => `- ${item}`).join('\n'),
    ],
    '\n\n',
  );
}

function casesSection(locale: Locale): string {
  const { home, copy } = BODIES[locale];
  return section(
    copy.headings.cases,
    home.cases.items.flatMap((item) => [
      `### ${item.name} (${item.tag})`,
      item.context,
      [
        `${home.cases.automatedLabel}:`,
        ...item.automated.map((line) => `- ${line}`),
        ...item.metrics
          .filter(isMeasured)
          .map(
            (metric) =>
              `- ${metric.label}: ${formatNumber(locale, metric.value)}${metric.unit}`,
          ),
      ].join('\n'),
    ]),
    '\n\n',
  );
}

function aboutSection(locale: Locale): string {
  const { about, copy } = BODIES[locale];
  const { founder } = CONTENT[locale];
  return section(
    copy.headings.about,
    [
      `${titleText(about.title)}. ${about.lead}`,
      `${founder.name}, ${founder.role}. ${richText(founder.bio)}`,
      ...about.story.map(({ parts }) => richText(parts)),
      `### ${about.principles.title}`,
      about.principles.items
        .map(({ title, text }) => `- ${title}: ${text}`)
        .join('\n'),
      `### ${about.vision.title}`,
      about.vision.text,
    ],
    '\n\n',
  );
}

export function buildLlmsFull(
  locale: Locale,
  entity: PublishedEntity = legalEntity(locale),
): string {
  const { home, copy, faq } = BODIES[locale];
  const { verifactu } = home;
  return doc([
    ...preamble(
      locale,
      entity,
      copy.fullNote.replace('{index}', llmsUrl(locale, 'llms')),
    ),
    section(
      titleText(home.hero.title),
      [home.hero.lead, home.hero.audience],
      '\n\n',
    ),
    pricingSection(locale),
    section(
      copy.headings.problems,
      home.problems.items.flatMap((item) => [
        `### ${item.title}`,
        item.problem,
        `${home.problems.fixLabel}: ${item.fix}`,
      ]),
      '\n\n',
    ),
    ...(verifactu
      ? [
          section(
            titleText(verifactu.title),
            [...verifactu.paragraphs, verifactu.checked],
            '\n\n',
          ),
        ]
      : []),
    section(
      copy.headings.process,
      home.process.steps.flatMap((step) => [`### ${step.label}`, step.text]),
      '\n\n',
    ),
    casesSection(locale),
    aboutSection(locale),
    section(copy.headings.portfolio, portfolioLines(locale)),
    section(
      copy.headings.faq,
      faq.flatMap(({ question, answer }) => [`### ${question}`, answer]),
      '\n\n',
    ),
    section(copy.headings.contact, contactLines(locale)),
    section(copy.headings.pages, pagesLines(locale)),
    optional(locale, 'llms-full'),
  ]);
}

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Robots-Tag': 'noindex',
};

const built = new Map<string, string>();

function llmsBody(file: LlmsFile, locale: Locale): string {
  const key = `${file}:${locale}`;
  let body = built.get(key);
  if (body === undefined) {
    body = file === 'llms' ? buildLlmsTxt(locale) : buildLlmsFull(locale);
    built.set(key, body);
  }
  return body;
}

export function llmsNotFound(): Response {
  return new Response('Not found', { status: 404, headers: TEXT_HEADERS });
}

export function llmsResponse(
  file: LlmsFile,
  param: string | undefined,
): Response {
  const locale = localeFromParam(param);
  if (locale === undefined) return llmsNotFound();
  return new Response(llmsBody(file, locale), {
    headers: { ...TEXT_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}
