import { z } from 'zod';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import type { Locale } from '@/lib/i18n';
import { isLiveHost } from '@/lib/redirects';
import { formatSlotLabel } from '@/lib/slot-format';
import { canonicalZone } from '@/lib/slots';
import { bookMeeting as book } from '@/server/booking';
import { bookingInputSchema } from '@/server/booking-schema';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { defineTool } from '@/server/tools/types';

export function bookedResult({
  start,
  end,
  meetUrl,
  locale,
  timeZone,
}: {
  start: number;
  end: number;
  meetUrl: string | null;
  locale: Locale;
  timeZone: string | undefined;
}) {
  return {
    status: 'booked',
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    label: formatSlotLabel(
      locale,
      start,
      (timeZone && canonicalZone(timeZone)) || DEFAULT_ZONE[locale],
    ),
    meetUrl,
  } as const;
}

const output = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('booked'),
    start: z.string(),
    end: z.string(),
    label: z.string(),
    meetUrl: z.string().nullable(),
  }),
  z.object({
    status: z.literal('rejected'),
    reason: z.enum(['invalid_slot', 'slot_taken', 'day_full', 'limit']),
  }),
  z.object({
    status: z.literal('unavailable'),
    reason: z.enum(['not_configured', 'calendar_error']),
    contact: contactSchema,
  }),
]);

export const bookMeeting = defineTool({
  name: 'book_meeting',
  description: {
    en: 'Books a free 30-minute call with Zenet Labs at a slot returned by check_availability, creates a Google Meet link and emails the visitor. Only call it after the visitor has confirmed the time, name and email.',
    es: 'Reserva una llamada gratuita de 30 minutos con Zenet Labs en una hora devuelta por check_availability, crea un enlace de Google Meet y escribe al visitante. Llámala solo cuando el visitante haya confirmado la hora, el nombre y el correo.',
  },
  input: bookingInputSchema,
  output,
  readOnly: false,
  async execute(input, ctx): Promise<z.input<typeof output>> {
    const result = await book(
      {
        input,
        channel: ctx.channel,
        consentAt: ctx.consentAt,
        attribution: ctx.attribution,
        chatSessionId: ctx.chatSessionId,
      },
      {
        deps: ctx.deps,
        now: ctx.now,
        isTest: !isLiveHost(ctx.hostname),
      },
    );
    if (result.status === 'booked') {
      return bookedResult({
        ...result,
        locale: input.locale,
        timeZone: input.timeZone,
      });
    }
    if (result.status === 'rejected') return result;
    return {
      status: 'unavailable',
      reason: result.reason,
      contact: contactFor(input.locale, ctx.deps.site),
    };
  },
});
