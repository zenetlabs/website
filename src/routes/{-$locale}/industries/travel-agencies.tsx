import { createFileRoute } from '@tanstack/react-router';
import { SectorPage } from '@/components/sector-page';
import { loadSectorContent } from '@/content/load';
import { landingRouteOptions } from '@/lib/landing-route';

export const Route = createFileRoute('/{-$locale}/industries/travel-agencies')({
  ...landingRouteOptions('travelAgencies', loadSectorContent),
  component: TravelAgencies,
});

function TravelAgencies() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <SectorPage locale={locale} {...data} />;
}
