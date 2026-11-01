import {
  createFileRoute,
  notFound,
  Outlet,
  rootRouteId,
} from '@tanstack/react-router';
import { NotFound } from '@/components/not-found';
import { PageShell } from '@/components/page-shell';
import { localeFromParam } from '@/lib/i18n';
import { hasLocale, isPublished } from '@/lib/page-registry';
import { STRUCTURED_DATA } from '@/lib/structured-data';

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params, context, matches }) => {
    if (localeFromParam(params.locale) === undefined) {
      throw notFound({ routeId: rootRouteId });
    }
    const page = matches.findLast((match) => match.staticData.page)?.staticData
      .page;
    if (
      page !== undefined &&
      (!hasLocale(page, context.locale) || !isPublished(page))
    ) {
      throw notFound();
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
