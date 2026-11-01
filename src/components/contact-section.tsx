import { ContactForm, type ContactPrefill } from '@/components/contact-form';
import {
  CONTACT_FRAME,
  type ContactCopy,
  ContactIntro,
} from '@/components/contact-intro';
import { Container } from '@/components/section';

export function ContactSection({
  copy,
  prefill,
}: {
  copy: ContactCopy;
  prefill?: ContactPrefill;
}) {
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="border-t border-hairline"
    >
      <Container className={CONTACT_FRAME}>
        <ContactIntro copy={copy} id="contact-title" />
        <div className="lg:col-span-7">
          <ContactForm prefill={prefill} />
        </div>
      </Container>
    </section>
  );
}
