import { z } from 'zod';
import { loadPricingContent } from '@/content/load';
import type { Price, ServiceId } from '@/content/types';
import { locales } from '@/lib/i18n';
import { formatPrice } from '@/lib/money';
import { serviceHref } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { defineTool } from '@/server/tools/types';

const SERVICE_IDS = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
] as const satisfies readonly ServiceId[];

const priceSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  note: z.string().optional(),
  min: z.number(),
  max: z.number().optional(),
  qualifier: z.literal('from').optional(),
  unit: z.enum(['one-off', 'month']),
  currency: z.enum(['SGD', 'EUR']),
  display: z.string(),
});

export const getPricing = defineTool({
  name: 'get_pricing',
  description: {
    en: 'Returns the official Zenet Labs price list, or one service, in the currency of the locale. Prices are authoritative: never quote a different figure.',
    es: 'Devuelve la lista oficial de precios de Zenet Labs, o un servicio, en la moneda del idioma. Los precios son oficiales: no cites otra cifra.',
  },
  input: z.object({
    service: z
      .enum(SERVICE_IDS)
      .optional()
      .describe('One service to price. Leave out for the whole list.'),
    locale: z.enum(locales).default('en'),
  }),
  output: z.object({
    currency: z.enum(['SGD', 'EUR']),
    taxNote: z.string(),
    pricingUrl: z.string(),
    services: z.array(
      z.object({
        id: z.enum(SERVICE_IDS),
        name: z.string(),
        summary: z.string(),
        url: z.string(),
        prices: z.array(priceSchema),
      }),
    ),
  }),
  readOnly: true,
  async execute({ service, locale }) {
    const { page, services } = await loadPricingContent(locale);
    const wanted = SERVICE_IDS.filter(
      (id) => service === undefined || id === service,
    );
    const withDisplay = (price: Price) => ({
      ...price,
      display: formatPrice(locale, price),
    });
    return {
      currency: services.diagnostic.prices[0].currency,
      taxNote: page.taxNote,
      pricingUrl: pageUrl(locale, 'pricing'),
      services: wanted.map((id) => ({
        id,
        name: services[id].name,
        summary: services[id].summary,
        url: `${SITE.url}${serviceHref(locale, id)}`,
        prices: services[id].prices.map(withDisplay),
      })),
    };
  },
});
