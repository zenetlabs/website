import { z } from 'zod';
import { loadHomeContent } from '@/content/load';
import { searchFaq } from '@/lib/faq-search';
import { locales } from '@/lib/i18n';
import { pageUrl } from '@/lib/seo';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { defineTool } from '@/server/tools/types';

export const getFaq = defineTool({
  name: 'get_faq',
  description: {
    en: 'Searches the Zenet Labs FAQ and returns up to three matching questions with their official answers. Use it before answering questions about what Zenet Labs does, how it works or how it handles data.',
    es: 'Busca en las preguntas frecuentes de Zenet Labs y devuelve hasta tres preguntas con su respuesta oficial. Úsala antes de responder sobre qué hace Zenet Labs, cómo trabaja o cómo trata los datos.',
  },
  input: z.object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe('The visitor question, in a few words.'),
    locale: z.enum(locales).default('en'),
  }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
        url: z.string(),
      }),
    ),
    contact: contactSchema,
  }),
  readOnly: true,
  async execute({ query, locale }, { deps }) {
    const { faq } = await loadHomeContent(locale);
    return {
      items: searchFaq(faq, query, 3).map(({ id, question, answer }) => ({
        id,
        question,
        answer,
        url: `${pageUrl(locale, 'home')}#faq-${id}`,
      })),
      contact: contactFor(locale, deps.site),
    };
  },
});
