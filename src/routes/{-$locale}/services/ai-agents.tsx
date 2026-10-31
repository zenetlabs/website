import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/ai-agents')({
  ...serviceRouteOptions('agents'),
  component: AgentsPage,
});

function AgentsPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="agents" locale={locale} {...data} />;
}
