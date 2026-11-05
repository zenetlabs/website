import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute(
  '/{-$locale}/services/automation-diagnostic',
)({
  ...serviceRouteOptions('diagnostic'),
  component: DiagnosticPage,
});

function DiagnosticPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="diagnostic" locale={locale} {...data} />;
}
