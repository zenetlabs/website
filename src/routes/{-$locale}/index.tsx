import { createFileRoute } from '@tanstack/react-router';
import { ContactSection } from '@/components/contact-section';
import { Hero } from '@/components/hero';
import { Portfolio } from '@/components/portfolio';
import { Process } from '@/components/process';
import { Services } from '@/components/services';
import { pageHeadFor } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/')({
  staticData: { page: 'home' },
  head: ({ match }) => pageHeadFor(match.context.locale, 'home'),
  component: Home,
});

function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Process />
      <Portfolio />
      <ContactSection />
    </>
  );
}
