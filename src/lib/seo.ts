import { defaultLocale, type Locale, localePath, locales } from '@/lib/i18n';
import { SITE } from '@/lib/site';

type Meta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type Link = { rel: string; href: string; hrefLang?: string };

const OG_LOCALES: Record<Locale, string> = { en: 'en_US', es: 'es_ES' };
const OG_IMAGE_PATH = '/og.png';
export const SITE_NAME = 'Zenet Labs';

export function pageUrl(locale: Locale, path: string): string {
  return `${SITE.url}${localePath(locale, path)}`;
}

export function alternateUrls(
  path: string,
): { hreflang: string; href: string }[] {
  return [
    ...locales.map((l) => ({ hreflang: l, href: pageUrl(l, path) })),
    { hreflang: 'x-default', href: pageUrl(defaultLocale, path) },
  ];
}

export function pageHead({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): { meta: Meta[]; links: Link[] } {
  const url = pageUrl(locale, path);
  const image = `${SITE.url}${OG_IMAGE_PATH}`;
  const alternateLocale = locales.filter((l) => l !== locale);

  const meta: Meta[] = [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:locale', content: OG_LOCALES[locale] },
    ...alternateLocale.map((l) => ({
      property: 'og:locale:alternate',
      content: OG_LOCALES[l],
    })),
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ];

  const links: Link[] = [
    { rel: 'canonical', href: url },
    ...alternateUrls(path).map(({ hreflang, href }) => ({
      rel: 'alternate',
      hrefLang: hreflang,
      href,
    })),
  ];

  return { meta, links };
}

export function jsonLd(data: Record<string, unknown>): {
  type: 'application/ld+json';
  children: string;
} {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data).replace(/</g, '\\u003c'),
  };
}
