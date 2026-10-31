import type {
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { contentRouteOptions } from '@/lib/content-route';
import type { Locale } from '@/lib/i18n';
import type { LandingPageId, ServicePageId } from '@/lib/page-registry';
import { serviceStructuredData } from '@/lib/page-structured-data';

type Priced = {
  copy: Pick<ServicePageContent, 'meta' | 'faq'>;
  hub: ServicesHubContent;
  services: Services;
};

export function landingRouteOptions<Data extends Priced>(
  page: ServicePageId | LandingPageId,
  load: (locale: Locale) => Promise<Data>,
) {
  return contentRouteOptions(page, load, (locale, { copy, hub, services }) =>
    serviceStructuredData(locale, page, copy, hub, services),
  );
}
