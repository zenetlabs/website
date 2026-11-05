import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/maintenance')({
  ...serviceRouteOptions('maintenance'),
  component: MaintenancePage,
});

function MaintenancePage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="maintenance" locale={locale} {...data} />;
}
