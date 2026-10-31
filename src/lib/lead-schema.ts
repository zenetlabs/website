import { z } from 'zod';
import { locales } from '@/lib/i18n';
import { ATTRIBUTION_LIMITS, isRelativePath } from '@/lib/lead-result';
import { isSingleLine } from '@/lib/single-line';

const singleLine = (max: number) =>
  z.string().trim().max(max).refine(isSingleLine);

const relative = (max: number) =>
  z.string().max(max).refine(isRelativePath).refine(isSingleLine);

export const leadRequestSchema = z.object({
  source: z.literal('form'),
  locale: z.enum(locales),
  name: singleLine(100).min(1),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  company: singleLine(100).optional(),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
  website: z.string().max(200),
  attribution: z.object({
    landing: relative(ATTRIBUTION_LIMITS.landing).or(z.literal('')),
    referrer: z.string().max(ATTRIBUTION_LIMITS.referrer).refine(isSingleLine),
    page: relative(ATTRIBUTION_LIMITS.page),
  }),
});

export type LeadRequest = z.infer<typeof leadRequestSchema>;
