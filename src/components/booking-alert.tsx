import type { Ref } from 'react';
import { FormAlert } from '@/components/form-parts';
import type { BookPageContent } from '@/content/types';
import type { PageFailure as BookingFailure } from '@/lib/booking-failure';

// A failure the visitor fixes on this page, not one to report by email.
const PLAIN: ReadonlySet<BookingFailure> = new Set(['taken', 'disposable']);

export function BookingAlert({
  copy,
  failure,
  alert,
}: {
  copy: BookPageContent;
  failure: BookingFailure | null;
  alert: Ref<HTMLParagraphElement>;
}) {
  if (failure === null) return null;
  if (PLAIN.has(failure)) {
    return (
      <p
        ref={alert}
        role="alert"
        tabIndex={-1}
        className="rounded-input border-2 border-fg px-4 py-3 text-ui-m outline-hidden"
      >
        {copy.errors[failure]}
      </p>
    );
  }
  return <FormAlert alertRef={alert}>{copy.errors[failure]}</FormAlert>;
}
