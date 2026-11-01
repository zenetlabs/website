import type { Thing, WithContext } from 'schema-dts';
import { defaultLocale, type Locale } from '@/lib/i18n';
import { ogImagePath } from '@/lib/og-image';
import {
  hasLocale,
  markdownPath,
  type PageId,
  pageLocales,
  pagePath,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type Meta =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type Link = { rel: string; href: string; hrefLang?: string; type?: string };

const OG_LOCALES: Record<Locale, string> = { en: 'en_SG', es: 'es_ES' };
export const SITE_NAME = 'Zenet Labs';

// The WebMCP origin trial reads its token from a meta tag; no token, no tag.
export function originTrialMeta(
  token: string | null,
): { httpEquiv: string; content: string }[] {
  return token === null ? [] : [{ httpEquiv: 'origin-trial', content: token }];
}

export function pageUrl(locale: Locale, page: PageId): string {
  return `${SITE.url}${pagePath(locale, page)}`;
}

export function markdownUrl(locale: Locale, page: PageId): string {
  return `${SITE.url}${markdownPath(locale, page)}`;
}

export function alternateUrls(
  page: PageId,
): { hreflang: string; href: string }[] {
  return [
    ...pageLocales(page).map((l) => ({ hreflang: l, href: pageUrl(l, page) })),
    ...(hasLocale(page, defaultLocale)
      ? [{ hreflang: 'x-default', href: pageUrl(defaultLocale, page) }]
      : []),
  ];
}

export function pageHead({
  locale,
  page,
  title,
  description,
}: {
  locale: Locale;
  page: PageId;
  title: string;
  description: string;
}): { meta: Meta[]; links: Link[] } {
  const url = pageUrl(locale, page);
  const image = `${SITE.url}${ogImagePath(locale)}`;
  const alternateLocale = pageLocales(page).filter((l) => l !== locale);

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
    ...alternateUrls(page).map(({ hreflang, href }) => ({
      rel: 'alternate',
      hrefLang: hreflang,
      href,
    })),
    {
      rel: 'alternate',
      type: 'text/markdown',
      href: markdownUrl(locale, page),
    },
  ];

  return { meta, links };
}

export function jsonLd(data: WithContext<Thing>): {
  type: 'application/ld+json';
  children: string;
} {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data).replace(/</g, '\\u003c'),
  };
}
