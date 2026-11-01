import { verifactuDates } from '@/content/es/verifactu';
import {
  loadHoldedPairContent,
  loadHomeContent,
  loadPricingContent,
  loadSectorContent,
  loadServicePageContent,
  loadVerifactuContent,
} from '@/content/load';
import type { Rich, ServicesHubContent } from '@/content/types';
import { CONTENT, legalEntity } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { NAVIGATE_SECTIONS } from '@/lib/navigate';
import {
  HOLDED_PAGE_IDS,
  isServicePage,
  type PageId,
  pagesIn,
  SERVICE_PAGE_IDS,
  type SiteFlags,
} from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { titleText } from '@/lib/title-text';
import { LADDER } from '@/server/chat/guard';

type Labels = {
  about: string;
  services: string;
  how: string;
  problems: string;
  cases: string;
  pages: string;
  verifactu: string;
  faq: string;
  navigate: string;
  question: string;
  answer: string;
  price: string;
  timeline: string;
  includes: string;
  market: string;
  contact: (booking: boolean) => string;
  operator: (name: string, country: string) => string;
};

const LABELS: Record<Locale, Labels> = {
  en: {
    about: 'ABOUT',
    services: 'SERVICES AND OFFICIAL PRICES',
    how: 'HOW WE WORK',
    problems: 'PROBLEMS WE SOLVE',
    cases: 'CASES',
    pages: 'SERVICE PAGES',
    verifactu: 'VERIFACTU',
    faq: 'FAQ',
    navigate: 'PAGES YOU CAN OPEN WITH NAVIGATE',
    question: 'Q',
    answer: 'A',
    price: 'Price',
    timeline: 'Timeline',
    includes: 'Includes',
    market:
      "Prices on this site are in Singapore dollars (S$) and exclude GST. The Spanish site, for clients in Spain, lists its own prices in euros; don't quote them here.",
    contact: (booking) =>
      `Contact: ${PUBLIC_EMAIL}, the contact form at the end of the home page${booking ? ', or a 30-minute call' : ''}.`,
    operator: (name, country) => `Operated by ${name}, ${country}.`,
  },
  es: {
    about: 'SOBRE NOSOTROS',
    services: 'SERVICIOS Y PRECIOS OFICIALES',
    how: 'CÓMO TRABAJAMOS',
    problems: 'PROBLEMAS QUE RESOLVEMOS',
    cases: 'CASOS',
    pages: 'PÁGINAS DE SERVICIO',
    verifactu: 'VERIFACTU',
    faq: 'PREGUNTAS FRECUENTES',
    navigate: 'PÁGINAS QUE PUEDES ABRIR CON NAVIGATE',
    question: 'P',
    answer: 'R',
    price: 'Precio',
    timeline: 'Plazo',
    includes: 'Incluye',
    market:
      'Los precios de esta web son en euros y no incluyen el IVA. La web en inglés, para Singapur, tiene sus propios precios en dólares de Singapur; no los cites aquí.',
    contact: (booking) =>
      `Contacto: ${PUBLIC_EMAIL}, el formulario de contacto al final de la página de inicio${booking ? ' o una llamada de 30 minutos' : ''}.`,
    operator: (name, country) => `Opera ${name}, ${country}.`,
  },
};

function pageTitle(hub: ServicesHubContent, id: PageId): string {
  if (isServicePage(id)) return hub.cards[id].name;
  if (id === 'services') return titleText(hub.title);
  const landing = Object.entries(hub.landing).find(([key]) => key === id);
  return landing?.[1] ?? id;
}

function richText(parts: Rich): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : part.text))
    .join('');
}

function section(heading: string, lines: readonly string[]): string {
  return `${heading}\n${lines.join('\n')}`;
}

async function landingLeads(
  locale: Locale,
  site: SiteFlags,
): Promise<{ id: PageId; name: string; lead: string }[]> {
  const published = new Set(pagesIn(locale, site));
  const services = SERVICE_PAGE_IDS.filter((id) => published.has(id)).map(
    async (id) => {
      const { copy, hub } = await loadServicePageContent(locale, id);
      return { id, name: hub.cards[id].name, lead: copy.hero.lead };
    },
  );
  if (locale !== 'es') return Promise.all(services);
  const holded = HOLDED_PAGE_IDS.filter((id) => published.has(id)).map(
    async (id) => {
      const { copy, hub } = await loadHoldedPairContent(id);
      return { id, name: hub.landing[id] ?? id, lead: copy.hero.lead };
    },
  );
  const sector = published.has('travelAgencies')
    ? [
        loadSectorContent().then(({ copy, hub }) => ({
          id: 'travelAgencies' as const,
          name: hub.landing.travelAgencies ?? 'travelAgencies',
          lead: copy.hero.lead,
        })),
      ]
    : [];
  return Promise.all([...services, ...holded, ...sector]);
}

async function verifactuLines(locale: Locale, site: SiteFlags) {
  if (locale !== 'es' || !pagesIn(locale, site).includes('verifactu'))
    return [];
  const { copy, hub } = await loadVerifactuContent();
  const { deadlines } = copy;
  return [
    `- ${hub.landing.verifactu ?? 'Verifactu'}: ${copy.hero.lead}`,
    ...deadlines.rows.map((row) => `- ${row.who}: ${row.date}`),
    `- ${deadlines.announced}`,
    `- ${deadlines.producers}`,
    `- ${deadlines.checked} (${verifactuDates.checkedOn})`,
  ];
}

export async function buildKnowledge(
  locale: Locale,
  site: SiteFlags,
): Promise<string> {
  const labels = LABELS[locale];
  const [{ home, faq }, { page, services, hub }] = await Promise.all([
    loadHomeContent(locale),
    loadPricingContent(locale),
  ]);
  const entity = legalEntity(locale);
  const { founder, countryNames } = CONTENT[locale];
  const [leads, verifactu] = await Promise.all([
    landingLeads(locale, site),
    verifactuLines(locale, site),
  ]);
  const booking = pagesIn(locale, site).includes('book');

  const about = section(labels.about, [
    home.hero.lead,
    labels.operator(entity.legalName, countryNames[entity.address.country]),
    `${founder.name}, ${founder.role}. ${richText(founder.bio)}`,
    labels.market,
    labels.contact(booking),
  ]);
  const offer = section(labels.services, [
    ...LADDER.map((id) => {
      const { name, summary, prices } = services[id];
      const details = page.details[id];
      const parts = [
        `- ${name} [${id}]: ${summary}`,
        `${labels.price}: ${formatPriceSummary(locale, prices)}.`,
        details.timeline ? `${labels.timeline}: ${details.timeline}.` : '',
        `${labels.includes}: ${details.includes.join('; ')}.`,
      ];
      return parts.filter(Boolean).join(' ');
    }),
    page.taxNote,
  ]);
  const process = section(
    labels.how,
    home.process.steps.map((step) => `- ${step.label}: ${step.text}`),
  );
  const problems = section(
    labels.problems,
    home.problems.items.map(
      (item) =>
        `- ${item.title}: ${item.problem} ${home.problems.fixLabel}: ${item.fix}`,
    ),
  );
  const cases = section(
    labels.cases,
    home.cases.items.map((item) => {
      const metrics = item.metrics
        .filter((metric) => metric.value !== null)
        .map((metric) => `${metric.label}: ${metric.value}${metric.unit}`);
      return [
        `- ${item.name} (${item.tag}): ${item.context}`,
        `${home.cases.automatedLabel}: ${item.automated.join('; ')}.`,
        ...metrics,
      ].join(' ');
    }),
  );
  const pages = section(
    labels.pages,
    leads.map((lead) => `- ${lead.name} [${lead.id}]: ${lead.lead}`),
  );
  const faqs = section(
    labels.faq,
    faq.flatMap((item) => [
      `${labels.question}: ${item.question}`,
      `${labels.answer}: ${item.answer}`,
    ]),
  );
  const targets = section(labels.navigate, [
    ...pagesIn(locale, site).map((id) => `- ${id}: ${pageTitle(hub, id)}`),
    `- home sections: ${NAVIGATE_SECTIONS.join(', ')}`,
  ]);
  return [
    about,
    offer,
    process,
    problems,
    cases,
    pages,
    ...(verifactu.length > 0 ? [section(labels.verifactu, verifactu)] : []),
    faqs,
    targets,
  ].join('\n\n');
}
