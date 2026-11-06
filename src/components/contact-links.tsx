import { TEXT_LINK } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { contactWithMessage, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

// The ways to reach us that work when the assistant does not: the booking page
// while it is live, the contact form (carrying what the visitor typed) and the
// address.
export function ContactLinks({
  locale,
  booking,
  labels,
  message = null,
  className = '',
}: {
  locale: Locale;
  booking: boolean;
  labels: { book: string; form: string };
  message?: string | null;
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${className}`}>
      {booking ? (
        <li>
          <a href={pagePath(locale, 'book')} className={TEXT_LINK}>
            {labels.book}
          </a>
        </li>
      ) : null}
      <li>
        <a
          href={
            message === null
              ? navHref(locale, { page: 'contact' })
              : contactWithMessage(locale, message)
          }
          className={TEXT_LINK}
        >
          {labels.form}
        </a>
      </li>
      <li>
        <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
          {PUBLIC_EMAIL}
        </a>
      </li>
    </ul>
  );
}
