import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/integrations/')({
  ...serviceRouteOptions('integrations'),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="integrations" locale={locale} {...data} />;
}
