import {
  createFileRoute,
  notFound,
  Outlet,
  rootRouteId,
} from '@tanstack/react-router';
import { NotFound } from '@/components/not-found';
import { PageShell } from '@/components/page-shell';
import { prefixedLocales } from '@/lib/i18n';
import { STRUCTURED_DATA } from '@/lib/structured-data';

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    if (
      params.locale !== undefined &&
      !prefixedLocales.some((locale) => locale === params.locale)
    ) {
      throw notFound({ routeId: rootRouteId });
    }
  },
  scripts: ({ match }) => STRUCTURED_DATA[match.context.locale],
  component: LocaleLayout,
  notFoundComponent: LocaleNotFound,
});

function LocaleLayout() {
  return (
    <PageShell>
      <Outlet />
    </PageShell>
  );
}

function LocaleNotFound() {
  const { locale } = Route.useRouteContext();
  return <NotFound locale={locale} />;
}
