import { z } from 'zod';

const CONTROL_CHARACTERS = /[\p{Cc}\p{Zl}\p{Zp}\u202A-\u202E\u2066-\u2069]/u;

const singleLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !CONTROL_CHARACTERS.test(value));

export const contactSchema = z.object({
  name: singleLine(100).min(1),
  email: z.email().max(254),
  company: singleLine(100).optional(),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(200),
  locale: z.enum(['en', 'es']),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactResult =
  | { ok: true }
  | { ok: false; error: 'captcha' | 'send' };
