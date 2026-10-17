import { ContactForm } from '@/components/contact-form';
import { Container, EmphasisTitle } from '@/components/section';
import { EYEBROW, TEXT_LINK } from '@/components/ui';
import { useMessages } from '@/lib/i18n';
import { PUBLIC_EMAIL } from '@/lib/site';

export function ContactSection() {
  const { contact } = useMessages();

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="border-t border-hairline"
    >
      <Container className="grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className={EYEBROW}>{contact.eyebrow}</p>
          <h2 id="contact-title" className="mt-5 text-balance">
            <EmphasisTitle parts={contact.title} />
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted-fg">{contact.text}</p>
          <p className="mt-8">
            {contact.mail}{' '}
            <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
              {PUBLIC_EMAIL}
            </a>
          </p>
          <p className={`mt-4 ${EYEBROW}`}>{contact.human}</p>
        </div>
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </Container>
    </section>
  );
}
