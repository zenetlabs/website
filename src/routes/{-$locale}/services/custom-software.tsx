import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/custom-software')({
  ...serviceRouteOptions('software'),
  component: SoftwarePage,
});

function SoftwarePage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="software" locale={locale} {...data} />;
}
