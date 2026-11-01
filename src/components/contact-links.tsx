import { TEXT_LINK } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

// The ways to reach us that work when the assistant does not: the booking page
// while it is live, the contact form and the address.
export function ContactLinks({
  locale,
  booking,
  labels,
  className = '',
}: {
  locale: Locale;
  booking: boolean;
  labels: { book: string; form: string };
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
          href={navHref(locale, { page: 'home', section: 'contact' })}
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
