import { type ReactNode, useRef } from 'react';
import { DeskChat } from '@/components/desk-chat';
import type { DeskCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isPublished } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

// The working desk of a hero: one surface, the conversation above and the
// page's own `footer` below (home's next-slots rail; contact's AI door has none).
// The contact page's desk is marked `data-contact-desk` instead of
// `data-desk`, so home's scripts and tests never mistake one for the other.
export function AgentDesk({
  copy,
  locale,
  footer,
  contact = false,
}: {
  copy: DeskCopy;
  locale: Locale;
  footer: ReactNode;
  contact?: boolean;
}) {
  const desk = useRef<HTMLElement>(null);
  const booking = isPublished('book', SITE);

  return (
    <section
      ref={desk}
      aria-labelledby="desk-title"
      {...(contact ? { 'data-contact-desk': '' } : { 'data-desk': '' })}
      className={contact ? 'desk contact-desk' : 'desk'}
    >
      <DeskChat copy={copy} locale={locale} booking={booking} from={desk} />
      {footer}
    </section>
  );
}
