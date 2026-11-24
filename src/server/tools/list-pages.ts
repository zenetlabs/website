import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { pagesIn } from '@/lib/page-registry';
import { pageTitles } from '@/server/tools/page-titles';
import { defineTool } from '@/server/tools/types';

export const listPages = defineTool({
  name: 'list_pages',
  description: {
    en: 'Lists every page of the Zenet Labs website in the visitor language, with its id and title. Pass an id to get_page to read the page, or to navigate to open it.',
    es: 'Lista todas las páginas del sitio de Zenet Labs en el idioma del visitante, con su id y su título. Pasa un id a get_page para leer la página o a navigate para abrirla.',
  },
  input: z.object({ locale: z.enum(locales).default('en') }),
  output: z.object({
    pages: z.array(z.object({ id: z.string(), title: z.string() })),
  }),
  readOnly: true,
  // The agents' prompts already carry the page list.
  surfaces: ['webmcp'],
  async execute({ locale }, { deps }) {
    const titles = await pageTitles(locale);
    return {
      pages: pagesIn(locale, deps.site).map((id) => ({
        id,
        title: titles.get(id) ?? id,
      })),
    };
  },
});
