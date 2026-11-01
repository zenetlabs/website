import { z } from 'zod';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import { locales } from '@/lib/i18n';
import { formatSlotLabel } from '@/lib/slot-format';
import { canonicalZone, isTimeZone, zonedToInstant } from '@/lib/slots';
import { availability } from '@/server/booking';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { defineTool, isTestContext } from '@/server/tools/types';

const SLOT_LIMIT = 30;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function startOfDay(date: string | undefined, zone: string, shift: number) {
  const match = date === undefined ? null : DATE.exec(date);
  if (!match) return undefined;
  const [, year = 0, month = 0, day = 0] = match;
  const local = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) + shift),
  );
  return (
    zonedToInstant(
      {
        year: local.getUTCFullYear(),
        month: local.getUTCMonth() + 1,
        day: local.getUTCDate(),
      },
      0,
      zone,
    ) ?? undefined
  );
}

const output = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    timeZone: z.string(),
    slots: z.array(
      z.object({ start: z.string(), end: z.string(), label: z.string() }),
    ),
    more: z.boolean(),
    contact: contactSchema,
  }),
  z.object({
    status: z.literal('unavailable'),
    reason: z.enum(['not_configured', 'calendar_error']),
    contact: contactSchema,
  }),
]);

export const checkAvailability = defineTool({
  name: 'check_availability',
  description: {
    en: 'Returns free 30-minute call slots with Zenet Labs, optionally between two dates in a time zone. Only offer times returned by this tool.',
    es: 'Devuelve las horas libres para una llamada de 30 minutos con Zenet Labs, opcionalmente entre dos fechas en una zona horaria. Ofrece solo horas que devuelva esta herramienta.',
  },
  input: z.object({
    from: z.iso
      .date()
      .optional()
      .describe('First day to look at, as YYYY-MM-DD.'),
    to: z.iso.date().optional().describe('Last day to look at, as YYYY-MM-DD.'),
    timeZone: z
      .string()
      .max(64)
      .refine(isTimeZone)
      .optional()
      .describe('IANA time zone of the visitor, such as Europe/Madrid.'),
    locale: z.enum(locales).default('en'),
  }),
  output,
  readOnly: true,
  async execute(
    { from, to, timeZone, locale },
    ctx,
  ): Promise<z.input<typeof output>> {
    const zone = (timeZone && canonicalZone(timeZone)) || DEFAULT_ZONE[locale];
    const contact = contactFor(locale, ctx.deps.site);
    const result = await availability(
      {
        deps: ctx.deps,
        now: ctx.now,
        isTest: isTestContext(ctx),
      },
      { from: startOfDay(from, zone, 0), to: startOfDay(to, zone, 1) },
    );
    if (result.status === 'unavailable') {
      return { status: 'unavailable', reason: result.reason, contact };
    }
    return {
      status: 'ok',
      timeZone: zone,
      slots: result.slots.slice(0, SLOT_LIMIT).map(({ start, end }) => ({
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        label: formatSlotLabel(locale, start, zone),
      })),
      more: result.slots.length > SLOT_LIMIT,
      contact,
    };
  },
});
