import { ContactForm } from '@/components/contact-form';
import { Container, EmphasisTitle } from '@/components/section';
import { EYEBROW, TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import { PUBLIC_EMAIL } from '@/lib/site';

export function ContactSection({ copy }: { copy: HomeContent['contact'] }) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="border-t border-hairline"
    >
      <Container className="grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className={EYEBROW}>{copy.eyebrow}</p>
          <h2 id="contact-title" className="mt-5 text-balance">
            <EmphasisTitle parts={copy.title} />
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-fg">{copy.lead}</p>
          <p className="mt-8">
            {copy.mail}{' '}
            <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
              {PUBLIC_EMAIL}
            </a>
          </p>
          <p className={`mt-4 ${EYEBROW}`}>{copy.human}</p>
        </div>
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </Container>
    </section>
  );
}
