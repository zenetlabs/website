import type { Locale } from '@/lib/i18n';
import { renderMarkdown } from '@/lib/markdown-response';
import { type PageId, pagePath } from '@/lib/page-registry';
import { SITE } from '@/lib/site';
import { memoAsync } from '@/server/memo-async';
import { type ParsedPage, parsePage } from '@/server/page-outline';

type Key = { locale: Locale; page: PageId };

async function render({ locale, page }: Key): Promise<ParsedPage> {
  const { default: handler } = await import(
    '@tanstack/react-start/server-entry'
  );
  const url = `${SITE.url}${pagePath(locale, page)}`;
  const { html, response } = await renderMarkdown(
    async (request) => handler.fetch(request),
    new Request(url, { headers: { Accept: 'text/html' } }),
    url,
  );
  if (!html || response.status !== 200) {
    console.warn('get_page: render failed', {
      locale,
      page,
      status: response.status,
    });
    await response.body?.cancel();
    throw new Error('page not rendered');
  }
  return parsePage(await response.text());
}

const parsed = memoAsync(render, {
  keyOf: ({ locale, page }) => `${locale}:${page}`,
});

// The page's `.md`, rendered in process through the same handler and converter
// as `/<page>.md`, then split once: one render per page per isolate. A failed
// render is remembered for a short while and answers null.
export async function loadPage(
  locale: Locale,
  page: PageId,
): Promise<ParsedPage | null> {
  try {
    return await parsed({ locale, page });
  } catch {
    return null;
  }
}
