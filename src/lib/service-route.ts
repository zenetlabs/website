import { loadServicePageContent } from '@/content/load';
import { landingRouteOptions } from '@/lib/landing-route';
import type { ServicePageId } from '@/lib/page-registry';

export function serviceRouteOptions(page: ServicePageId) {
  return landingRouteOptions(page, (locale) =>
    loadServicePageContent(locale, page),
  );
}
