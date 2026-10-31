import { createFileRoute } from '@tanstack/react-router';
import { HoldedPairPage } from '@/components/holded-pair-page';
import { loadHoldedPairContent } from '@/content/load';
import { landingRouteOptions } from '@/lib/landing-route';

export const Route = createFileRoute(
  '/{-$locale}/services/integrations/holded-hubspot',
)({
  ...landingRouteOptions('holdedHubspot', () =>
    loadHoldedPairContent('holdedHubspot'),
  ),
  component: HoldedHubspotPage,
});

function HoldedHubspotPage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <HoldedPairPage page="holdedHubspot" locale={locale} {...data} />;
}
