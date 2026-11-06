import type { Locale } from '@/lib/i18n';
import { resolveNavigation } from '@/lib/navigate';
import {
  HOLDED_PAGE_IDS,
  type LandingPageId,
  type SiteFlags,
} from '@/lib/page-registry';

// The words that tie a visitor's message to a landing page, all of them needed.
const KEYWORDS: ReadonlyArray<[LandingPageId, readonly string[]]> = [
  ...HOLDED_PAGE_IDS.map((id): [LandingPageId, readonly string[]] => [
    id,
    ['holded', id.slice('holded'.length).toLowerCase()],
  ]),
  ['verifactu', ['verifactu']],
];

// A landing page that answers the message, as a link chip, when the model
// did not open one itself. Only pages published in the locale count.
export function relatedPage(
  message: string,
  locale: Locale,
  site: SiteFlags,
): { page: LandingPageId; href: string } | null {
  const text = message.toLowerCase();
  for (const [page, words] of KEYWORDS) {
    if (!words.every((word) => text.includes(word))) continue;
    const href = resolveNavigation({ page }, locale, site);
    if (href !== null) return { page, href };
  }
  return null;
}
