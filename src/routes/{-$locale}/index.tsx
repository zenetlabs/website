import { createFileRoute } from '@tanstack/react-router';
import { Cases } from '@/components/cases';
import { CompaniesStrip } from '@/components/companies-strip';
import { ContactSection } from '@/components/contact-section';
import { Faq } from '@/components/faq';
import { FounderSection } from '@/components/founder-section';
import { Hero } from '@/components/hero';
import { Problems } from '@/components/problems';
import { Process } from '@/components/process';
import { ServiceLadder } from '@/components/service-ladder';
import { VerifactuStrip } from '@/components/verifactu-strip';
import { loadHomeContent } from '@/content/load';
import { CONTENT } from '@/lib/content';
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
  const { founder } = CONTENT[locale];

  return (
    <>
      <Hero copy={home.hero} runlog={home.runlog} locale={locale} />
      <CompaniesStrip copy={home.companies} />
      <Problems copy={home.problems} />
      {home.verifactu ? (
        <VerifactuStrip copy={home.verifactu} locale={locale} />
      ) : null}
      <ServiceLadder copy={home.services} services={services} locale={locale} />
      <Process copy={home.process} />
      <Cases copy={home.cases} locale={locale} />
      <FounderSection copy={home.founder} founder={founder} locale={locale} />
      <Faq copy={home.faq} items={faq} />
      <ContactSection copy={home.contact} />
    </>
  );
}
