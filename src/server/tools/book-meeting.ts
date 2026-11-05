import { z } from 'zod';
import { BOOKING_RULES, DEFAULT_ZONE } from '@/content/booking-rules';
import type { Locale } from '@/lib/i18n';
import { formatSlotLabel } from '@/lib/slot-format';
import { canonicalZone } from '@/lib/slots';
import { bookMeeting as book } from '@/server/booking';
import { bookingInputSchema } from '@/server/booking-schema';
import { contactFor, contactSchema } from '@/server/tools/contact';
import { defineTool, isTestContext } from '@/server/tools/types';

// The answer to a request: the slot is held until expiresAt and the visitor has
// an email with the confirm link. Nothing is booked yet.
export function pendingResult({
  start,
  end,
  expiresAt,
  resent,
  locale,
  timeZone,
}: {
  start: number;
  end: number;
  expiresAt: number;
  resent: boolean;
  locale: Locale;
  timeZone: string | undefined;
}) {
  return {
    status: 'pending',
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    label: formatSlotLabel(
      locale,
      start,
      (timeZone && canonicalZone(timeZone)) || DEFAULT_ZONE[locale],
    ),
    expiresAt: new Date(expiresAt).toISOString(),
    resent,
  } as const;
}

export const CONFIRM_WINDOW_MS = BOOKING_RULES.confirmMinutes * 60_000;

const output = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('pending'),
    start: z.string(),
    end: z.string(),
    label: z.string(),
    expiresAt: z.string(),
    resent: z.boolean(),
  }),
  z.object({
    status: z.literal('rejected'),
    reason: z.enum([
      'invalid_slot',
      'slot_taken',
      'day_full',
      'limit',
      'email_not_accepted',
    ]),
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
    en: 'Asks for a free 30-minute call with Zenet Labs at a slot returned by check_availability. The slot is held for 30 minutes and the visitor gets an email with a link; the call is booked, with a Google Meet link, only when they open it and press Confirm. Only call it after the visitor has confirmed the time, name and email.',
    es: 'Pide una llamada gratuita de 30 minutos con Zenet Labs en una hora devuelta por check_availability. La hora queda guardada 30 minutos y el visitante recibe un correo con un enlace; la llamada queda reservada, con un enlace de Google Meet, solo cuando lo abre y pulsa Confirmar. Llámala solo cuando el visitante haya confirmado la hora, el nombre y el correo.',
  },
  input: bookingInputSchema,
  output,
  readOnly: false,
  async execute(input, ctx): Promise<z.input<typeof output>> {
    const result = await book(
      {
        input,
        channel: ctx.channel,
        surface: ctx.surface ?? 'page',
        consentAt: ctx.consentAt,
        attribution: ctx.attribution,
        chatSessionId: ctx.chatSessionId,
        voice: ctx.voice,
        origin: ctx.origin ?? ctx.deps.site.url,
        ip: ctx.ip ?? null,
      },
      {
        deps: ctx.deps,
        now: ctx.now,
        isTest: isTestContext(ctx),
      },
    );
    if (result.status === 'pending') {
      return pendingResult({
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
