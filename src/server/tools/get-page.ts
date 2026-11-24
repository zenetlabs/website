import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { PAGE_IDS, pagesIn } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { loadPage } from '@/server/page-markdown';
import { sectionParts } from '@/server/page-outline';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { defineTool } from '@/server/tools/types';

export const getPage = defineTool({
  name: 'get_page',
  description: {
    en: 'Reads a page of the Zenet Labs website, the same text as the page. Without section it returns the title, description and headings; with a section it returns the text under that heading, in parts of up to 1,500 characters.',
    es: 'Lee una página del sitio de Zenet Labs, el mismo texto que la página. Sin section devuelve el título, la descripción y los encabezados; con una sección devuelve el texto bajo ese encabezado, en partes de hasta 1.500 caracteres.',
  },
  input: z.object({
    page: z.enum(PAGE_IDS).describe('Id of the page.'),
    section: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe('A heading from the list get_page returns.'),
    part: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Part of a long section, from 1.'),
    locale: z.enum(locales).default('en'),
  }),
  output: z.discriminatedUnion('status', [
    z.object({
      status: z.literal('page'),
      page: z.string(),
      title: z.string(),
      description: z.string(),
      url: z.string(),
      sections: z.array(z.string()),
    }),
    z.object({
      status: z.literal('section'),
      page: z.string(),
      section: z.string(),
      text: z.string(),
      part: z.number(),
      parts: z.number(),
      next: z.string().nullable(),
    }),
    // The section or the part does not exist: `sections` or `parts` say what does.
    z.object({
      status: z.literal('not_found'),
      page: z.string(),
      sections: z.array(z.string()).optional(),
      parts: z.number().optional(),
    }),
    // The page is not readable here: book, a page the locale lacks, a dark one,
    // or a page that could not be rendered just now.
    z.object({
      status: z.literal('not_available'),
      page: z.string(),
      contact: contactSchema,
    }),
  ]),
  readOnly: true,
  // A page read is a render and a few KB of text.
  cost: 3,
  async execute({ page, section, part, locale }, { deps }) {
    const unavailable = {
      status: 'not_available' as const,
      page,
      contact: contactFor(locale, deps.site),
    };
    // `book` renders from the calendar: agents use check_availability instead.
    if (page === 'book' || !pagesIn(locale, deps.site).includes(page)) {
      return unavailable;
    }
    const parsed = await loadPage(locale, page);
    if (parsed === null) return unavailable;
    if (section === undefined) {
      return {
        status: 'page' as const,
        page,
        title: parsed.title,
        description: parsed.description,
        url: pageUrl(locale, page),
        sections: parsed.sections,
      };
    }
    const found = sectionParts(parsed, section);
    if (found === null) {
      return {
        status: 'not_found' as const,
        page,
        sections: parsed.sections,
      };
    }
    const number = part ?? 1;
    const text = found.parts[number - 1];
    if (text === undefined) {
      return {
        status: 'not_found' as const,
        page,
        parts: found.parts.length,
      };
    }
    return {
      status: 'section' as const,
      page,
      section: found.heading,
      text,
      part: number,
      parts: found.parts.length,
      next: found.next,
    };
  },
});
