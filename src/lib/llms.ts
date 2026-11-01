import { aboutPage as enAbout } from '@/content/en/about';
import { faq as enFaq } from '@/content/en/faq';
import { home as enHome } from '@/content/en/home';
import { legalMeta as enLegalMeta } from '@/content/en/legal-meta';
import { llms as enLlms } from '@/content/en/llms';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { services as enServices } from '@/content/en/services';
import { aboutPage as esAbout } from '@/content/es/about';
import { faq as esFaq } from '@/content/es/faq';
import { home as esHome } from '@/content/es/home';
import { legalMeta as esLegalMeta } from '@/content/es/legal-meta';
import { llms as esLlms } from '@/content/es/llms';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { services as esServices } from '@/content/es/services';
import {
  loadCalculatorContent,
  loadCaseContent,
  loadHoldedPairContent,
  loadSectorContent,
  loadServicePageContent,
  loadServicesHubContent,
  loadVerifactuContent,
} from '@/content/load';
import type {
  AboutPageContent,
  CalculatorPageContent,
  Card,
  CasePageContent,
  FaqItem,
  HomeContent,
  LandingContentMap,
  LlmsCopy,
  Metric,
  PageFacts,
  PricingPageContent,
  PublishedEntity,
  Rich,
  ServiceId,
  ServicePageContent,
  ServicePageLabels,
  Services,
  ServicesHubContent,
  TitleParts,
} from '@/content/types';
import {
  CONTENT,
  describeEntity,
  foundedLine,
  legalEntity,
} from '@/lib/content';
import { crumbName, hubNames } from '@/lib/crumb-names';
import {
  type Locale,
  localeFromParam,
  localePath,
  messages,
  otherLocale,
} from '@/lib/i18n';
import { isMeasured } from '@/lib/metrics';
import { formatNumber, formatPrice, formatPriceSummary } from '@/lib/money';
import {
  HOLDED_PAGE_IDS,
  hasLocale,
  isLandingPage,
  isPublished,
  isServicePage,
  LANDING_PAGE_IDS,
  type PageId,
  pagesIn,
  SERVICE_PAGE_IDS,
  type ServicePageId,
  type SiteFlags,
  serviceOf,
} from '@/lib/page-registry';
import { contentMeta, legalMetaKey, pageCopy } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';
import { markdownUrl, pageUrl, SITE_NAME } from '@/lib/seo';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
import { titleText } from '@/lib/title-text';

type Bodies = {
  home: HomeContent;
  pricing: PricingPageContent;
  about: AboutPageContent;
  services: Services;
  faq: readonly FaqItem[];
  copy: LlmsCopy;
};

const LEGAL_META = { en: enLegalMeta, es: esLegalMeta };

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

export type LandingBodies = {
  viatsy: CasePageContent;
  spanish?: LandingContentMap;
};

export type ServiceBodies = {
  calculator: CalculatorPageContent;
  hub: ServicesHubContent;
  pages: Record<ServicePageId, ServicePageContent>;
  landing: LandingBodies;
};

async function landingBodies(locale: Locale): Promise<LandingBodies> {
  const { copy: viatsy } = await loadCaseContent(locale);
  if (!hasLocale('verifactu', locale)) return { viatsy };
  const [
    holdedPrestashop,
    holdedWoocommerce,
    holdedHubspot,
    verifactu,
    travelAgencies,
  ] = await Promise.all([
    loadHoldedPairContent('holdedPrestashop'),
    loadHoldedPairContent('holdedWoocommerce'),
    loadHoldedPairContent('holdedHubspot'),
    loadVerifactuContent(),
    loadSectorContent(),
  ]);
  return {
    viatsy,
    spanish: {
      holdedPrestashop: holdedPrestashop.copy,
      holdedWoocommerce: holdedWoocommerce.copy,
      holdedHubspot: holdedHubspot.copy,
      verifactu: verifactu.copy,
      travelAgencies: travelAgencies.copy,
    },
  };
}

export async function serviceBodies(locale: Locale): Promise<ServiceBodies> {
  const [
    { hub },
    automation,
    integrations,
    agents,
    software,
    training,
    landing,
    { copy: calculator },
  ] = await Promise.all([
    loadServicesHubContent(locale),
    loadServicePageContent(locale, 'automation'),
    loadServicePageContent(locale, 'integrations'),
    loadServicePageContent(locale, 'agents'),
    loadServicePageContent(locale, 'software'),
    loadServicePageContent(locale, 'training'),
    landingBodies(locale),
    loadCalculatorContent(locale),
  ]);
  return {
    calculator,
    hub,
    landing,
    pages: {
      automation: automation.copy,
      integrations: integrations.copy,
      agents: agents.copy,
      software: software.copy,
      training: training.copy,
    },
  };
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

function pagesLines(
  locale: Locale,
  bodies: ServiceBodies,
  site: SiteFlags,
): string[] {
  return pagesIn(locale, site).map((page) => {
    const { title, description } = metaOf(locale, page, bodies);
    return `- [${title}](${markdownUrl(locale, page)}): ${description}`;
  });
}

export function metaOf(
  locale: Locale,
  page: PageId,
  { calculator, hub, pages, landing }: ServiceBodies,
): { title: string; description: string } {
  if (page === 'services') return contentMeta(hub.meta);
  if (isServicePage(page)) return contentMeta(pages[page].meta);
  if (page === 'viatsyCase') return contentMeta(landing.viatsy.meta);
  if (isLandingPage(page)) {
    if (!landing.spanish) throw new Error(`No content loaded for ${page}`);
    return contentMeta(landing.spanish[page].meta);
  }
  if (page === 'pricing') return contentMeta(BODIES[locale].pricing.meta);
  if (page === 'about') return contentMeta(BODIES[locale].about.meta);
  if (page === 'calculator') return contentMeta(calculator.meta);
  if (page === 'privacy' || page === 'cookies') {
    return contentMeta(LEGAL_META[locale][legalMetaKey(page)]);
  }
  return pageCopy(locale, page);
}

function faqLines(locale: Locale, { pages, landing }: ServiceBodies): string[] {
  const home = pageUrl(locale, 'home');
  return [
    ...BODIES[locale].faq.map(
      ({ id, question, answer }) =>
        `- [${question}](${home}#faq-${id}): ${answer}`,
    ),
    ...SERVICE_PAGE_IDS.flatMap((page) =>
      pages[page].faq.items.map(
        ({ id, question, answer }) =>
          `- [${question}](${pageUrl(locale, page)}#faq-${id}): ${answer}`,
      ),
    ),
    ...(landing.spanish
      ? LANDING_PAGE_IDS.flatMap(
          (page) =>
            landing.spanish?.[page].faq.items.map(
              ({ id, question, answer }) =>
                `- [${question}](${pageUrl(locale, page)}#faq-${id}): ${answer}`,
            ) ?? [],
        )
      : []),
  ];
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

export async function buildLlmsTxt(
  locale: Locale,
  entity: PublishedEntity = legalEntity(locale),
  site: SiteFlags = SITE,
): Promise<string> {
  const { services, copy } = BODIES[locale];
  const bodies = await serviceBodies(locale);
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
    section(copy.headings.pages, pagesLines(locale, bodies, site)),
    section(copy.headings.faq, faqLines(locale, bodies)),
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

function calculatorSection(
  locale: Locale,
  { calculator }: ServiceBodies,
  site: SiteFlags,
): string[] {
  if (!isPublished('calculator', site)) return [];
  const { questions } = calculator;
  const options = (labels: Record<string, { label: string }>) =>
    Object.values(labels)
      .map(({ label }) => `- ${label}`)
      .join('\n');
  return [
    section(
      `[${calculator.meta.title}](${pageUrl(locale, 'calculator')})`,
      [
        calculator.lead,
        `${calculator.disclaimer.title}. ${calculator.disclaimer.text}`,
        calculator.taxNote,
        ...[
          questions.type,
          questions.tools,
          questions.volume,
          questions.extras,
          questions.urgency,
          questions.maintenance,
        ].map((question) => `${question.legend}\n${options(question.options)}`),
      ],
      '\n\n',
    ),
  ];
}

function factsBlock(
  locale: Locale,
  id: ServiceId,
  facts: PageFacts,
  labels: ServicePageLabels,
): string {
  const price = formatPriceSummary(locale, BODIES[locale].services[id].prices);
  return [
    `- ${labels.who}: ${facts.who}`,
    `- ${labels.price}: ${price} (${labels.taxNote})`,
    `- ${labels.timeline}: ${facts.timeline}`,
    `- ${labels.start}: ${facts.start}`,
  ].join('\n');
}

function bullets(title: TitleParts, items: readonly Card[]): string {
  return [
    `${titleText(title)}:`,
    ...items.map((item) => `- ${item.title}: ${item.text}`),
  ].join('\n');
}

function faqBlocks(items: readonly FaqItem[]): string[] {
  return items.flatMap(({ question, answer }) => [`#### ${question}`, answer]);
}

function servicePagesSection(
  locale: Locale,
  { hub, pages }: ServiceBodies,
): string {
  const { copy } = BODIES[locale];
  return section(
    copy.headings.servicePages,
    [
      `${titleText(hub.title)}. ${hub.lead}`,
      ...SERVICE_PAGE_IDS.flatMap((page) => {
        const body = pages[page];
        return [
          `### [${hub.cards[page].name}](${pageUrl(locale, page)})`,
          body.hero.lead,
          factsBlock(locale, serviceOf(page), body.facts, hub.labels),
          bullets(body.useCases.title, body.useCases.items),
          [
            `${titleText(body.how.title)}:`,
            ...body.how.steps.map(
              (step, index) => `${index + 1}. ${step.label}: ${step.text}`,
            ),
          ].join('\n'),
          [
            `${titleText(body.case.title)}: ${body.case.text}`,
            ...body.case.points.map((point) => `- ${point}`),
          ].join('\n'),
          ...faqBlocks(body.faq.items),
        ];
      }),
    ],
    '\n\n',
  );
}

function holdedSection(
  locale: Locale,
  { hub, landing }: ServiceBodies,
): string[] {
  const { spanish } = landing;
  if (!spanish) return [];
  return [
    section(
      BODIES[locale].copy.headings.holded,
      HOLDED_PAGE_IDS.flatMap((page) => {
        const body = spanish[page];
        return [
          `### [${crumbName(hubNames(hub), page)}](${pageUrl(locale, page)})`,
          body.hero.lead,
          factsBlock(locale, 'integration', body.facts, hub.labels),
          [
            `${titleText(body.sync.title)}:`,
            ...body.sync.rows.map(
              (row) => `- ${row.data}: ${row.direction}. ${row.when}`,
            ),
          ].join('\n'),
          body.sync.note,
          bullets(body.edgeCases.title, body.edgeCases.items),
          ...faqBlocks(body.faq.items),
        ];
      }),
      '\n\n',
    ),
  ];
}

function verifactuBlocks(
  locale: Locale,
  { hub, landing }: ServiceBodies,
): string[] {
  const body = landing.spanish?.verifactu;
  if (!body) return [];
  const { deadlines, requirements, work } = body;
  return [
    `### [${crumbName(hubNames(hub), 'verifactu')}](${pageUrl(locale, 'verifactu')})`,
    body.hero.lead,
    deadlines.rows.map((row) => `- ${row.who}: ${row.date}`).join('\n'),
    `${deadlines.announced} ${deadlines.producers}`,
    [
      deadlines.exclusionsTitle,
      ...deadlines.exclusions.map((item) => `- ${item}`),
    ].join('\n'),
    deadlines.checked,
    bullets(requirements.title, requirements.items),
    bullets(work.title, work.items),
    `${work.limits} ${body.disclaimer}`,
    ...faqBlocks(body.faq.items),
  ];
}

function sectorSection(
  locale: Locale,
  { hub, landing }: ServiceBodies,
): string[] {
  const body = landing.spanish?.travelAgencies;
  if (!body) return [];
  return [
    section(
      `[${crumbName(hubNames(hub), 'travelAgencies')}](${pageUrl(locale, 'travelAgencies')})`,
      [
        body.hero.lead,
        body.work.items
          .map((item) => `- ${item.title}: ${item.today} → ${item.automated}`)
          .join('\n'),
        body.platform.text,
        ...faqBlocks(body.faq.items),
      ],
      '\n\n',
    ),
  ];
}

function caseBlocks(
  locale: Locale,
  { hub, landing }: ServiceBodies,
  metrics: readonly Metric[],
): string[] {
  const body = landing.viatsy;
  return [
    `[${crumbName(hubNames(hub), 'viatsyCase')}](${pageUrl(locale, 'viatsyCase')})`,
    `#### ${titleText(body.problem.title)}`,
    ...body.problem.paragraphs,
    `#### ${titleText(body.built.title)}`,
    body.built.items.map((item) => `- ${item.title}: ${item.text}`).join('\n'),
    `#### ${titleText(body.operations.title)}`,
    body.operations.steps
      .map((step, index) => `${index + 1}. ${step.label}: ${step.text}`)
      .join('\n'),
    `#### ${titleText(body.results.title)}`,
    [
      ...body.results.points.map((point) => `- ${point}`),
      ...metrics
        .filter(isMeasured)
        .map(
          (metric) =>
            `- ${metric.label}: ${formatNumber(locale, metric.value)}${metric.unit}`,
        ),
    ].join('\n'),
  ];
}

function casesSection(locale: Locale, bodies: ServiceBodies): string {
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
      ...(item.link?.page === 'viatsyCase'
        ? caseBlocks(locale, bodies, item.metrics)
        : []),
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

export async function buildLlmsFull(
  locale: Locale,
  entity: PublishedEntity = legalEntity(locale),
  site: SiteFlags = SITE,
): Promise<string> {
  const { home, copy, faq } = BODIES[locale];
  const bodies = await serviceBodies(locale);
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
    ...calculatorSection(locale, bodies, site),
    servicePagesSection(locale, bodies),
    ...holdedSection(locale, bodies),
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
            [
              ...verifactu.paragraphs,
              verifactu.checked,
              ...verifactuBlocks(locale, bodies),
            ],
            '\n\n',
          ),
        ]
      : []),
    section(
      copy.headings.process,
      home.process.steps.flatMap((step) => [`### ${step.label}`, step.text]),
      '\n\n',
    ),
    casesSection(locale, bodies),
    ...sectorSection(locale, bodies),
    aboutSection(locale),
    section(copy.headings.portfolio, portfolioLines(locale)),
    section(
      copy.headings.faq,
      faq.flatMap(({ question, answer }) => [`### ${question}`, answer]),
      '\n\n',
    ),
    section(copy.headings.contact, contactLines(locale)),
    section(copy.headings.pages, pagesLines(locale, bodies, site)),
    optional(locale, 'llms-full'),
  ]);
}

const TEXT_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Robots-Tag': 'noindex',
};

const built = new Map<string, Promise<string>>();

function llmsBody(file: LlmsFile, locale: Locale): Promise<string> {
  const key = `${file}:${locale}`;
  let body = built.get(key);
  if (body === undefined) {
    const pending =
      file === 'llms' ? buildLlmsTxt(locale) : buildLlmsFull(locale);
    built.set(key, pending);
    pending.catch(() => {
      if (built.get(key) === pending) built.delete(key);
    });
    body = pending;
  }
  return body;
}

export function llmsNotFound(): Response {
  return new Response('Not found', { status: 404, headers: TEXT_HEADERS });
}

export async function llmsResponse(
  file: LlmsFile,
  param: string | undefined,
): Promise<Response> {
  const locale = localeFromParam(param);
  if (locale === undefined) return llmsNotFound();
  return new Response(await llmsBody(file, locale), {
    headers: { ...TEXT_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}
