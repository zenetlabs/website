import { z } from 'zod';
import { BOOKING_LIMITS } from '@/lib/booking-limits';
import { locales } from '@/lib/i18n';
import { attributionSchema, singleLine } from '@/lib/lead-schema';
import { isTimeZone } from '@/lib/slots';

export const CHANNELS = ['web', 'chat', 'webmcp', 'voice'] as const;
export type Channel = (typeof CHANNELS)[number];

export const voiceRefSchema = z.object({
  sessionId: z.string(),
  conversationId: z.string().nullable(),
});

export type VoiceRef = z.infer<typeof voiceRefSchema>;

export const bookingInputSchema = z.object({
  slot: z.iso
    .datetime({ offset: true })
    .describe(
      'Exact start of a slot returned by check_availability (ISO 8601).',
    ),
  name: singleLine(BOOKING_LIMITS.name)
    .min(1)
    .describe('Full name of the visitor.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(BOOKING_LIMITS.email))
    .describe('Email address of the visitor.'),
  company: singleLine(BOOKING_LIMITS.company)
    .optional()
    .describe('Company of the visitor, if they gave one.'),
  topic: z
    .string()
    .trim()
    .min(BOOKING_LIMITS.topicMin)
    .max(BOOKING_LIMITS.topicMax)
    .describe(
      'What the visitor wants to talk about, in one sentence of at least ten characters.',
    ),
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

// A voice call books only after the agent read the details back and the
// visitor said yes; the schema makes that an explicit precondition.
export const voiceBookingSchema = bookingInputSchema.extend({
  confirmed: z
    .literal(true)
    .describe(
      'True only after the visitor said yes to your read-back of the time, name and email.',
    ),
});

export const bookingContextSchema = z.object({
  voice: voiceRefSchema.optional(),
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
