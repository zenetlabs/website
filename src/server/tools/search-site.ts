import { z } from 'zod';
import { llms as enLlms } from '@/content/en/llms';
import { llms as esLlms } from '@/content/es/llms';
import { hitsExact, words } from '@/lib/faq-search';
import { type Locale, locales } from '@/lib/i18n';
import { llmsFullText } from '@/lib/llms';
import { plainText } from '@/lib/markdown';
import {
  hasLocale,
  isPublished,
  PAGE_IDS,
  type PageId,
  type SiteFlags,
} from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { foldInPlace } from '@/server/chat/text';
import { memoAsync } from '@/server/memo-async';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { pageTitles } from '@/server/tools/page-titles';
import { defineTool } from '@/server/tools/types';

const MAX_RESULTS = 5;
const PER_PAGE = 2;
const EXCERPT_MAX = 200;
const LEAD = 60;
const HEADINGS = { en: enLlms.headings, es: esLlms.headings };
const SECTION_PAGE = {
  pricing: 'pricing',
  servicePages: 'services',
  holded: 'integrations',
  cases: 'cases',
  about: 'about',
  contact: 'contact',
} as const satisfies Partial<Record<keyof (typeof enLlms)['headings'], PageId>>;
const HEADING = /^(#{2,4}) (.+)$/;
const LINE_LINK = /^\[[^\]]*\]\((\S+?)\)/;
const LINK_TARGET = /\]\((\S+?)\)/;

export type Passage = {
  page: PageId;
  heading: string;
  text: string;
  // Folded once when the index is built, not on every query.
  headingWords: readonly string[];
  textWords: readonly string[];
};

// Every page the locale has, dark ones included: a passage that links one is
// dropped by `passagesOf`, not misfiled under the page of its section.
function pageOfUrl(locale: Locale): (target: string) => PageId | undefined {
  const byUrl = new Map(
    PAGE_IDS.filter((page) => hasLocale(page, locale)).map((page) => [
      pageUrl(locale, page),
      page,
    ]),
  );
  return (target) => byUrl.get(target.split('#')[0] ?? target);
}

function sectionPage(locale: Locale, label: string): PageId | 'skip' {
  const headings = HEADINGS[locale];
  if (label === headings.pages || label === 'Optional') return 'skip';
  const key = Object.entries(headings).find(([, text]) => text === label)?.[0];
  const page = Object.entries(SECTION_PAGE).find(([name]) => name === key)?.[1];
  return page ?? 'home';
}

// The passages of `llms-full`: a heading and the lines under it. A passage
// belongs to the page its heading links to, else to the nearest linked `###`
// (a service's FAQ), else to the page of its section. That layout is pinned by
// `search-site.test.ts`. A passage of a page that is not published is dropped.
export function passagesOf(
  text: string,
  locale: Locale,
  site: SiteFlags,
): Passage[] {
  const lookup = pageOfUrl(locale);
  const blocks: { page: PageId; heading: string; lines: string[] }[] = [];
  let section: PageId | 'skip' | null = null;
  let headingPage: PageId | undefined;
  let linePage: PageId | undefined;
  let open = false;

  for (const line of text.split('\n')) {
    const match = HEADING.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) {
      const target = LINE_LINK.exec(line)?.[1];
      linePage = (target && lookup(target)) || linePage;
      if (open) blocks.at(-1)?.lines.push(line);
      continue;
    }
    const level = match[1].length;
    const linked = LINK_TARGET.exec(match[2])?.[1];
    const own = linked === undefined ? undefined : lookup(linked);
    const heading = plainText(match[2]).trim();
    if (level === 2) {
      section = sectionPage(locale, heading);
      headingPage = own;
      linePage = undefined;
    } else if (level === 3) {
      headingPage = own ?? headingPage;
      linePage = undefined;
    }
    open = section !== null && section !== 'skip';
    if (section !== null && section !== 'skip') {
      blocks.push({
        page: own ?? linePage ?? headingPage ?? section,
        heading,
        lines: [],
      });
    }
  }
  return blocks
    .filter(({ page }) => isPublished(page, site))
    .map(({ page, heading, lines }) => {
      const body = plainText(lines.join('\n').trim());
      return {
        page,
        heading,
        text: body,
        headingWords: words(heading),
        textWords: words(body),
      };
    });
}

function excerptOf(text: string, query: readonly string[]): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= EXCERPT_MAX) return flat;
  const folded = foldInPlace(flat);
  const found = query
    .map((word) => folded.indexOf(word))
    .filter((index) => index >= 0);
  const at = found.length > 0 ? Math.min(...found) : 0;
  const from = Math.max(0, at - LEAD);
  const start = from === 0 ? 0 : flat.indexOf(' ', from) + 1 || from;
  const body = flat.slice(start, start + EXCERPT_MAX - 2).trimEnd();
  return `${start > 0 ? '…' : ''}${body}…`.slice(0, EXCERPT_MAX);
}

export function searchPassages(
  passages: readonly Passage[],
  query: string,
): { page: PageId; excerpt: string }[] {
  const wanted = words(query);
  if (wanted.length === 0) return [];
  const perPage = new Map<PageId, number>();
  return passages
    .map((passage, index) => ({
      passage,
      index,
      score:
        3 * hitsExact(wanted, passage.headingWords) +
        hitsExact(wanted, passage.textWords),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter(({ passage }) => {
      const used = perPage.get(passage.page) ?? 0;
      perPage.set(passage.page, used + 1);
      return used < PER_PAGE;
    })
    .slice(0, MAX_RESULTS)
    .map(({ passage }) => ({
      page: passage.page,
      excerpt: excerptOf(
        passage.text === '' ? passage.heading : passage.text,
        wanted,
      ),
    }));
}

const indexOf = memoAsync(
  async ({ locale, site }: { locale: Locale; site: SiteFlags }) =>
    passagesOf(await llmsFullText(locale), locale, site),
  {
    keyOf: ({ locale, site }) =>
      `${locale}:${site.calculator.published}:${site.booking.published}`,
  },
);

export const searchSite = defineTool({
  name: 'search_site',
  description: {
    en: 'Searches the whole Zenet Labs website (services, prices, integrations, cases, the company, the FAQ and contact) for words such as a tool or a service, and returns up to five matching passages with their page id. Read more with get_page.',
    es: 'Busca palabras, como una herramienta o un servicio, en todo el sitio de Zenet Labs (servicios, precios, integraciones, casos, la empresa, las preguntas frecuentes y el contacto) y devuelve hasta cinco pasajes con el id de su página. Lee más con get_page.',
  },
  input: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe('Words to look for, such as a tool, a service or a question.'),
    locale: z.enum(locales).default('en'),
  }),
  output: z.object({
    results: z.array(
      z.object({
        page: z.string(),
        title: z.string(),
        excerpt: z.string(),
        url: z.string(),
      }),
    ),
    contact: contactSchema,
  }),
  readOnly: true,
  async execute({ query, locale }, { deps }) {
    const [passages, titles] = await Promise.all([
      indexOf({ locale, site: deps.site }),
      pageTitles(locale),
    ]);
    return {
      results: searchPassages(passages, query).map(({ page, excerpt }) => ({
        page,
        title: titles.get(page) ?? page,
        excerpt,
        url: pageUrl(locale, page),
      })),
      contact: contactFor(locale, deps.site),
    };
  },
});
