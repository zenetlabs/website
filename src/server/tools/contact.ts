import { z } from 'zod';
import type { Locale } from '@/lib/i18n';
import { isPublished, type SiteFlags } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { PUBLIC_EMAIL } from '@/lib/site';

export const contactSchema = z.object({
  email: z.literal(PUBLIC_EMAIL),
  contactUrl: z.string(),
  bookUrl: z.string().nullable(),
});

export function contactFor(locale: Locale, site: SiteFlags) {
  return {
    email: PUBLIC_EMAIL,
    contactUrl: `${pageUrl(locale, 'home')}#contact`,
    bookUrl: isPublished('book', site) ? pageUrl(locale, 'book') : null,
  } as const;
}
