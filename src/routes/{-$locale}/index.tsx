import { createFileRoute } from '@tanstack/react-router';
import { CompaniesStrip } from '@/components/companies-strip';
import { DeskClose } from '@/components/desk-close';
import { Faq } from '@/components/faq';
import { Hero } from '@/components/hero';
import { OfferSystem } from '@/components/offer-system';
import { Problems } from '@/components/problems';
import { Process } from '@/components/process';
import { EmphasisTitle } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { VerifactuStrip } from '@/components/verifactu-strip';
import { loadHomeContent } from '@/content/load';
import { formatPriceSummary } from '@/lib/money';
import { homeStructuredData } from '@/lib/page-structured-data';
import { pageHeadFor } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/')({
  staticData: { page: 'home' },
  loader: ({ context }) => loadHomeContent(context.locale),
  head: ({ match }) => pageHeadFor(match.context.locale, 'home'),
  scripts: ({ match, loaderData }) =>
    loaderData ? homeStructuredData(match.context.locale, loaderData.faq) : [],
  component: Home,
});

function Home() {
  const { locale } = Route.useRouteContext();
  const { home, services, faq } = Route.useLoaderData();

  return (
    <>
      <Hero
        copy={home.hero}
        desk={home.desk}
        diagnosticPrice={formatPriceSummary(locale, services.diagnostic.prices)}
        locale={locale}
      />
      <StickyZone locale={locale}>
        <CompaniesStrip
          copy={home.companies}
          more={home.cases.more}
          locale={locale}
        />
        <Problems copy={home.problems} />
        <OfferSystem copy={home.services} services={services} locale={locale} />
        <Process copy={home.process} />
        {home.verifactu ? (
          <VerifactuStrip copy={home.verifactu} locale={locale} />
        ) : null}
        <Faq copy={home.faq} items={faq} />
      </StickyZone>
      <DeskClose
        title={<EmphasisTitle parts={home.contact.title} />}
        lead={home.contact.lead}
        mail={home.contact.mail}
        human={home.contact.human}
        doors={home.doors}
        desk={home.desk}
        locale={locale}
      />
    </>
  );
}
