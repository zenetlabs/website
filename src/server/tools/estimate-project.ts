import { z } from 'zod';
import { loadCalculatorContent } from '@/content/load';
import { calculatorAnswersSchema } from '@/lib/calculator-answers-schema';
import { estimate, market, rangePrice } from '@/lib/estimate';
import { locales } from '@/lib/i18n';
import { formatPrice } from '@/lib/money';
import { isPublished } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { defineTool } from '@/server/tools/types';

const rangeSchema = z.object({ min: z.number(), max: z.number() });

const output = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    currency: z.enum(['SGD', 'EUR']),
    rulesVersion: z.string(),
    total: rangeSchema.extend({ display: z.string() }),
    weeks: rangeSchema,
    maintenance: z.object({
      tier: z.enum(['essential', 'standard', 'extended']),
      wanted: z.boolean(),
      display: z.string(),
    }),
    diagnostic: z.object({ display: z.string() }),
    disclaimer: z.string(),
    url: z.string(),
  }),
  z.object({
    status: z.literal('unavailable'),
    reason: z.literal('not_published'),
    pricingUrl: z.string(),
  }),
]);

export const estimateProject = defineTool({
  name: 'estimate_project',
  description: {
    en: 'Returns an indicative price range, timeline and suggested maintenance plan for a project, computed by fixed rules. It is an estimate, not a quote: the final price comes from the diagnostic.',
    es: 'Devuelve un rango de precio orientativo, un plazo y un plan de mantenimiento sugerido para un proyecto, calculado con reglas fijas. Es una estimación, no un presupuesto: el precio final sale del diagnóstico.',
  },
  input: z.object({
    answers: calculatorAnswersSchema,
    locale: z.enum(locales).default('en'),
  }),
  output,
  readOnly: true,
  async execute(
    { answers, locale },
    { deps },
  ): Promise<z.input<typeof output>> {
    if (!isPublished('calculator', deps.site)) {
      return {
        status: 'unavailable',
        reason: 'not_published',
        pricingUrl: pageUrl(locale, 'pricing'),
      };
    }
    const { copy, services } = await loadCalculatorContent(locale);
    const result = estimate(
      answers,
      market(services.diagnostic.prices[0].currency, services),
    );
    return {
      status: 'ok',
      currency: result.currency,
      rulesVersion: result.rulesVersion,
      total: {
        ...result.total,
        display: formatPrice(locale, rangePrice(result.total, result.currency)),
      },
      weeks: result.weeks,
      maintenance: {
        tier: result.maintenance.tier,
        wanted: result.maintenance.wanted,
        display: formatPrice(locale, result.maintenance.price),
      },
      diagnostic: { display: formatPrice(locale, result.diagnostic) },
      disclaimer: `${copy.disclaimer.title}. ${copy.disclaimer.text}`,
      url: pageUrl(locale, 'calculator'),
    };
  },
});
