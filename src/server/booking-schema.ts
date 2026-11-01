import { z } from 'zod';
import { BOOKING_LIMITS } from '@/lib/booking-limits';
import { locales } from '@/lib/i18n';
import { attributionSchema, singleLine } from '@/lib/lead-schema';
import { isTimeZone } from '@/lib/slots';

export const CHANNELS = ['web', 'chat', 'webmcp', 'voice'] as const;
export type Channel = (typeof CHANNELS)[number];

export const bookingInputSchema = z.object({
  slot: z.iso.datetime({ offset: true }),
  name: singleLine(BOOKING_LIMITS.name).min(1),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(BOOKING_LIMITS.email)),
  company: singleLine(BOOKING_LIMITS.company).optional(),
  topic: z
    .string()
    .trim()
    .min(BOOKING_LIMITS.topicMin)
    .max(BOOKING_LIMITS.topicMax),
  timeZone: z.string().max(64).refine(isTimeZone).optional(),
  locale: z.enum(locales).default('en'),
});

export type BookingInput = z.output<typeof bookingInputSchema>;

export const browserBookingSchema = bookingInputSchema.extend({
  consent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(200),
  attribution: attributionSchema,
  chatSessionId: z.uuid().optional(),
});

export const bookingContextSchema = z.object({
  booking: z.object({
    id: z.string(),
    start: z.number(),
    end: z.number(),
    timeZone: z.string().nullable(),
    channel: z.enum(CHANNELS),
    status: z.enum(['confirmed', 'failed', 'unknown']),
    meetUrl: z.string().nullable(),
    eventLink: z.string().nullable(),
    calendar: z.enum(['main', 'test']),
  }),
});

export type BookingContext = z.infer<typeof bookingContextSchema>['booking'];
