import { locales } from '@/lib/i18n';
import { PAGE_PATHS } from '@/lib/pages';
import { alternateUrls, pageUrl } from '@/lib/seo';

function buildSitemap(): string {
  const entries = locales.flatMap((locale) =>
    PAGE_PATHS.map((path) => {
      const alternates = alternateUrls(path)
        .map(
          ({ hreflang, href }) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`,
        )
        .join('\n');
      return `  <url>\n    <loc>${pageUrl(locale, path)}</loc>\n${alternates}\n  </url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
}

export const SITEMAP_XML = buildSitemap();
