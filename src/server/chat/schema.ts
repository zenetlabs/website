import { z } from 'zod';
import { CHAT_LIMITS } from '@/lib/chat-events';
import {
  localeField,
  pageField,
  timeZoneField,
  turnstileTokenField,
} from '@/server/request-fields';

const CONTROL_EXCEPT_NEWLINE = /(?!\n)\p{Cc}/u;
const TEST_PREFIX = /^\[TEST\]\s+/;

export const chatRequestSchema = z
  .object({
    locale: localeField,
    message: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_LIMITS.messageChars)
      .refine((value) => !CONTROL_EXCEPT_NEWLINE.test(value)),
    page: pageField,
    timeZone: timeZoneField.optional(),
    sessionId: z.uuid().optional(),
    turnstileToken: turnstileTokenField.optional(),
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
