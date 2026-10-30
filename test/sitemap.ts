export type SitemapEntry = {
  loc: string;
  lastmod: string;
  alternates: Map<string, string>;
};

export function parseSitemap(xml: string): SitemapEntry[] {
  return xml
    .split('<url>')
    .slice(1)
    .map((block) => ({
      loc: /<loc>([^<]+)<\/loc>/.exec(block)?.[1] ?? '',
      lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1] ?? '',
      alternates: new Map(
        [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].flatMap(
          ([, lang, href]) => (lang && href ? [[lang, href] as const] : []),
        ),
      ),
    }));
}
