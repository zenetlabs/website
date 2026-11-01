import { z } from 'zod';
import { CHAT_LIMITS } from '@/lib/chat-events';
import { locales } from '@/lib/i18n';
import { isRelativePath } from '@/lib/lead-result';
import { isSingleLine } from '@/lib/single-line';
import { isTimeZone } from '@/lib/slots';

const CONTROL_EXCEPT_NEWLINE = /(?!\n)\p{Cc}/u;
const TEST_PREFIX = /^\[TEST\]\s+/;

export const chatRequestSchema = z
  .object({
    locale: z.enum(locales),
    message: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_LIMITS.messageChars)
      .refine((value) => !CONTROL_EXCEPT_NEWLINE.test(value)),
    page: z.string().max(512).refine(isRelativePath).refine(isSingleLine),
    timeZone: z.string().max(64).refine(isTimeZone).optional(),
    sessionId: z.uuid().optional(),
    turnstileToken: z.string().min(1).max(2048).optional(),
  })
  .refine(
    ({ sessionId, turnstileToken }) =>
      (sessionId === undefined) !== (turnstileToken === undefined),
  );

// "[TEST] " marks acceptance and eval traffic so it can be deleted afterwards.
export function splitTest(message: string): {
  message: string;
  marked: boolean;
} {
  const stripped = message.replace(TEST_PREFIX, '').trim();
  return stripped === '' || stripped === message
    ? { message, marked: false }
    : { message: stripped, marked: true };
}
