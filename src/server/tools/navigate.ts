import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { NAVIGATE_SECTIONS } from '@/lib/navigate';
import { PAGE_IDS } from '@/lib/page-registry';
import { defineClientTool } from '@/server/tools/types';

export const navigateInput = z.object({
  page: z.enum(PAGE_IDS).describe('Id of the page to open.'),
  section: z
    .enum(NAVIGATE_SECTIONS)
    .optional()
    .describe('Section of the home page to scroll to.'),
  locale: z.enum(locales).default('en'),
});

export const navigate = defineClientTool({
  name: 'navigate',
  description: {
    en: 'Opens a page of the Zenet Labs website in the visitor browser. Only pages of the site can be opened.',
    es: 'Abre una página del sitio de Zenet Labs en el navegador del visitante. Solo se pueden abrir páginas del sitio.',
  },
  input: navigateInput,
  output: z.object({ url: z.string() }),
});
