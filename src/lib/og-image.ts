import type { Locale } from '@/lib/i18n';

export function ogImagePath(locale: Locale): string {
  return `/og-${locale}.png`;
}
