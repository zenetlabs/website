import { createFileRoute } from '@tanstack/react-router';
import { VerifactuPage } from '@/components/verifactu-page';
import { loadVerifactuContent } from '@/content/load';
import { landingRouteOptions } from '@/lib/landing-route';

export const Route = createFileRoute('/{-$locale}/verifactu')({
  ...landingRouteOptions('verifactu', loadVerifactuContent),
  component: Verifactu,
});

function Verifactu() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return <VerifactuPage locale={locale} {...data} />;
}
