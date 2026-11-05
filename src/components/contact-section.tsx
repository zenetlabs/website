import type { ReactNode } from 'react';
import { BandSection } from '@/components/band-section';
import { ContactForm, type ContactPrefill } from '@/components/contact-form';
import {
  CONTACT_FRAME,
  type ContactCopy,
  ContactIntro,
} from '@/components/contact-intro';

export function ContactSection({
  copy,
  prefill,
  after,
}: {
  copy: ContactCopy;
  prefill?: ContactPrefill;
  after?: ReactNode;
}) {
  return (
    <BandSection
      id="contact"
      labelledBy="contact-title"
      containerClassName={CONTACT_FRAME}
    >
      <ContactIntro copy={copy} id="contact-title" />
      <div className="lg:col-span-7">
        <ContactForm prefill={prefill} />
        {after}
      </div>
    </BandSection>
  );
}
