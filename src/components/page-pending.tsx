import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookingAlert } from '@/components/booking-alert';
import { BookingPending } from '@/components/booking-pending';
import { LazyTurnstile } from '@/components/form-parts';
import { H3 } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { useResend } from '@/components/use-resend';
import type { BookPageContent } from '@/content/types';
import type { BookingRequest } from '@/lib/booking-client';
import { type PageFailure, pageFailureOf } from '@/lib/booking-failure';
import { SURFACE_ACTION } from '@/lib/booking-surfaces';
import type { Locale } from '@/lib/i18n';

// The booking page once a request is held: loaded only after a submit, so the
// page's own script stays small. It runs its own challenge for the resend.
export function PagePending({
  copy,
  locale,
  request,
  label,
}: {
  copy: BookPageContent;
  locale: Locale;
  request: BookingRequest;
  label: string;
}) {
  const challenge = useChallenge();
  const again = useResend(challenge);
  const [failure, setFailure] = useState<PageFailure | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  // Stable, so the heading takes focus once, when the panel appears.
  const focusHeading = useCallback((node: HTMLHeadingElement | null) => {
    node?.focus();
  }, []);

  async function onResend() {
    setFailure(null);
    const failed = await again.resend(request);
    if (failed === null) return;
    flushSync(() => setFailure(pageFailureOf(failed)));
    alert.current?.focus();
  }

  return (
    <div className="grid gap-4" data-booking-pending>
      <BookingPending
        headingRef={focusHeading}
        headingClass={H3}
        copy={copy.pending}
        label={label}
        email={request.email}
        resend={again.status}
        canResend={challenge.token !== ''}
        onResend={onResend}
      >
        <LazyTurnstile
          engaged
          action={SURFACE_ACTION.page}
          locale={locale}
          instance={challenge.instance}
          onToken={challenge.setToken}
          onError={() => {
            challenge.setToken('');
            setFailure('captcha');
          }}
        />
        <BookingAlert copy={copy} failure={failure} alert={alert} />
      </BookingPending>
    </div>
  );
}
