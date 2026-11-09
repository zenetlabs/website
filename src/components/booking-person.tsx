import { meet as enMeet } from '@/content/en/meet';
import { meet as esMeet } from '@/content/es/meet';
import type { Locale } from '@/lib/i18n';

const MEET: Record<Locale, string> = { en: enMeet, es: esMeet };

// Who the visitor will meet, in a person's amber: the booking page, the chat's
// booking card and the WebMCP dialog.
export function BookingPerson({ locale }: { locale: Locale }) {
  return (
    <p className="booking-person" data-booking-person>
      <span aria-hidden="true" className="monogram size-10">
        <span className="icon icon-human size-5" />
      </span>
      {MEET[locale]}
    </p>
  );
}
