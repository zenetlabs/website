import { locales } from '@/lib/i18n';
import { PAGES, pagesIn, type SiteFlags } from '@/lib/page-registry';
import { alternateUrls, pageUrl } from '@/lib/seo';
import { SITE } from '@/lib/site';

export function buildSitemap(site: SiteFlags = SITE): string {
  const entries = locales.flatMap((locale) =>
    pagesIn(locale, site).map((page) => {
      const alternates = alternateUrls(page)
        .map(
          ({ hreflang, href }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        )
        .join('\n');
      return `  <url>\n    <loc>${pageUrl(locale, page)}</loc>\n    <lastmod>${PAGES[page].lastmod}</lastmod>\n${alternates}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
}

export const SITEMAP_XML = buildSitemap();
