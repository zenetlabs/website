import { createFileRoute } from '@tanstack/react-router';
import { ServicePage } from '@/components/service-page';
import { serviceRouteOptions } from '@/lib/service-route';

export const Route = createFileRoute('/{-$locale}/services/ai-training')({
  ...serviceRouteOptions('training'),
  component: TrainingPage,
});

function TrainingPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <ServicePage page="training" locale={locale} {...data} />;
}
