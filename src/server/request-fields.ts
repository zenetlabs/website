import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { isRelativePath } from '@/lib/lead-result';
import { isSingleLine } from '@/lib/single-line';
import { isTimeZone } from '@/lib/slots';

// The fields the chat and the voice endpoints read the same way.
export const localeField = z.enum(locales);
export const pageField = z
  .string()
  .max(512)
  .refine(isRelativePath)
  .refine(isSingleLine);
export const timeZoneField = z.string().max(64).refine(isTimeZone);
export const turnstileTokenField = z.string().min(1).max(2048);
