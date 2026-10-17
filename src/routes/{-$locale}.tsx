import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { NotFound } from '@/components/not-found';
import { PageShell } from '@/components/page-shell';
import { prefixedLocales } from '@/lib/i18n';
import { jsonLd } from '@/lib/seo';
import { SITE } from '@/lib/site';

const organization = jsonLd({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Zenet Labs',
  legalName: 'Zenet Technology Pte. Ltd.',
  url: SITE.url,
  logo: `${SITE.url}/icons/android-chrome-512x512.png`,
  foundingDate: '2022',
  founder: { '@type': 'Person', name: 'Albert Sabaté' },
  address: {
    '@type': 'PostalAddress',
    streetAddress:
      '160 Robinson Road #14-04, Singapore Business Federation Center',
    addressLocality: 'Singapore',
    postalCode: '068914',
    addressCountry: 'SG',
  },
});

const webSite = jsonLd({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Zenet Labs',
  url: SITE.url,
  inLanguage: ['en', 'es'],
});

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    if (
      params.locale !== undefined &&
      !prefixedLocales.some((locale) => locale === params.locale)
    ) {
      throw notFound();
    }
  },
  scripts: () => [organization, webSite],
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
  return (
    <PageShell>
      <NotFound locale={locale} />
    </PageShell>
  );
}
