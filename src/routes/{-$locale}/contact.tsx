import { createFileRoute } from '@tanstack/react-router';
import { ContactSection } from '@/components/contact-section';
import { Process } from '@/components/process';
import { Container, EmphasisTitle } from '@/components/section';
import { LEAD } from '@/components/ui';
import { VoiceCallout } from '@/components/voice-button';
import { loadContactContent } from '@/content/load';
import { contactStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/contact')({
  staticData: { page: 'contact' },
  loader: ({ context }) => loadContactContent(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'contact', loaderData.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData ? contactStructuredData(match.context.locale, loaderData) : [],
  component: Contact,
});

function Contact() {
  const page = Route.useLoaderData();
  const { voice, ...form } = page.form;

  return (
    <>
      <section data-ground="paper">
        <Container className="py-12 md:py-24">
          <h1 className="max-w-4xl">
            <EmphasisTitle parts={page.title} marker />
          </h1>
          <p className={`mt-6 ${LEAD}`}>{page.lead}</p>
        </Container>
      </section>
      <ContactSection
        copy={form}
        after={
          voice ? (
            <VoiceCallout text={voice.text} button={voice.button} />
          ) : null
        }
      />
      <Process id="next" copy={page.next} />
    </>
  );
}
