import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/ai-automation')({
  ...serviceRouteOptions('automation'),
  component: AutomationPage,
});

function AutomationPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="automation" locale={locale} {...data} />;
}
