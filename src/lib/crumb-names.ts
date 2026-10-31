import type { ServicesHubContent } from '@/content/types';
import { type PageId, SERVICE_PAGE_IDS } from '@/lib/page-registry';
import { SITE_NAME } from '@/lib/seo';

export type Names = Partial<Record<PageId, string>>;

export function crumbName(names: Names, page: PageId): string {
  const name = names[page];
  if (name === undefined) throw new Error(`No breadcrumb name for ${page}`);
  return name;
}

export function hubNames(hub: ServicesHubContent): Names {
  const names: Names = {
    home: SITE_NAME,
    services: hub.meta.title,
    ...hub.landing,
  };
  for (const page of SERVICE_PAGE_IDS) names[page] = hub.cards[page].name;
  return names;
}
