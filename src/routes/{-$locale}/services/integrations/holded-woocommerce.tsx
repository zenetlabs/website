import { createFileRoute } from '@tanstack/react-router';
import { HoldedPairPage } from '@/components/holded-pair-page';
import { loadHoldedPairContent } from '@/content/load';
import { landingRouteOptions } from '@/lib/landing-route';

export const Route = createFileRoute(
  '/{-$locale}/services/integrations/holded-woocommerce',
)({
  ...landingRouteOptions('holdedWoocommerce', () =>
    loadHoldedPairContent('holdedWoocommerce'),
  ),
  component: HoldedWoocommercePage,
});

function HoldedWoocommercePage() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <HoldedPairPage page="holdedWoocommerce" locale={locale} {...data} />;
}
