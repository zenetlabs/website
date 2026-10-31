import type { ServicesHubContent } from '@/content/types';
import type { PageId, ServicePageId } from '@/lib/page-registry';
import { SITE_NAME } from '@/lib/seo';

export type Names = Partial<Record<PageId, string>>;

export function crumbName(names: Names, page: PageId): string {
  const name = names[page];
  if (name === undefined) throw new Error(`No breadcrumb name for ${page}`);
  return name;
}

export function hubNames(hub: ServicesHubContent): Names {
  return { home: SITE_NAME, services: hub.meta.title };
}

export function servicePageNames(
  hub: ServicesHubContent,
  page: ServicePageId,
): Names {
  return { ...hubNames(hub), [page]: hub.cards[page].name };
}
