import { type Ref, useCallback, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookingPending } from '@/components/booking-pending';
import { BookingPerson } from '@/components/booking-person';
import { BookingWhen } from '@/components/booking-when';
import {
  BookingDetailsFields,
  ConsentCheckbox,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { H3, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { useResend } from '@/components/use-resend';
import {
  type BookingRequest as Submitted,
  submitBooking,
} from '@/lib/booking-client';
import { type BookingFailureKind, failureOf } from '@/lib/booking-failure';
import { SURFACE_ACTION } from '@/lib/booking-surfaces';
import { text } from '@/lib/form-data';
import { messages } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';
import {
  type BookingRequest,
  isEnvelope,
  type ToolEnvelope,
} from '@/lib/webmcp/confirmation';

type Status = 'idle' | 'pending' | BookingFailureKind;
type Held = { when: string; request: Submitted };

const UNAVAILABLE: ToolEnvelope = { ok: false, error: 'unavailable' };

// The agent learns that the time is held and until when, nothing else: the
// visitor books it from the email.
function pendingEnvelope(label: string, expiresAt: number): ToolEnvelope {
  return {
    ok: true,
    result: {
      status: 'pending',
      label,
      expiresAt: new Date(expiresAt).toISOString(),
    },
  };
}

function DialogAlert({
  copy,
  failure,
  alertRef,
}: {
  copy: BookingRequest['copy'];
  failure: BookingFailureKind;
  alertRef: Ref<HTMLParagraphElement>;
}) {
  if (failure === 'disposable') {
    return (
      <p
        ref={alertRef}
        role="alert"
        tabIndex={-1}
        className="rounded-input border-2 border-fg px-4 py-3 text-ui-m outline-hidden"
      >
        {copy.errors.disposable}
      </p>
    );
  }
  return <FormAlert alertRef={alertRef}>{copy.errors[failure]}</FormAlert>;
}

export function WebMcpBookingDialog({ request }: { request: BookingRequest }) {
  const { proposal, locale, label, copy } = request;
  const { form } = messages[locale].contact;
  const [status, setStatus] = useState<Status>('idle');
  const challenge = useChallenge(() => setStatus('captcha'));
  const [answered, setAnswered] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  const again = useResend(challenge);
  const element = useRef<HTMLDialogElement | null>(null);
  // Stable, so a re-render does not close and reopen the dialog. Cleanup also
  // runs when the confirmation is taken down, and restores the page's focus.
  const modal = useCallback((node: HTMLDialogElement | null) => {
    element.current = node;
    if (!node) return;
    const previous = document.activeElement;
    if (!node.open) node.showModal();
    return () => {
      if (node.open) node.close();
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);
  const pendingHeading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const introId = useId();
  const pending = status === 'pending';
  const failure = status === 'idle' || pending ? null : status;

  // Only the first Escape after an activation can be cancelled, so a second one
  // closes the dialog: while a booking is being sent it is put straight back.
  function onClose() {
    // A submit still waiting for its token goes with the dialog.
    challenge.cancel();
    if (!request.isHeld()) {
      request.dismiss();
      return;
    }
    if (element.current?.open === false) element.current.showModal();
  }

  const onSubmit = challenge.onSubmit(
    (data, token) => {
      void book(data, token);
    },
    // A synthetic submit skips the browser's own required check.
    (data) => data.get('consent') === 'on',
  );

  async function book(data: FormData, token: string) {
    if (!request.begin()) return;
    setStatus('pending');
    const submitted: Submitted = {
      slot: proposal.slot,
      name: text(data, 'name'),
      email: text(data, 'email'),
      company: text(data, 'company') || undefined,
      topic: text(data, 'topic'),
      timeZone: proposal.timeZone,
      locale,
      consent: true,
      turnstileToken: token,
      website: text(data, 'website'),
      attribution: await attribution(),
      surface: 'webmcp',
    };
    const result = await submitBooking(submitted);
    challenge.retry();
    if (result.kind === 'pending') {
      const when = formatSlotLabel(locale, result.start, proposal.timeZone);
      flushSync(() => {
        setHeld({ when, request: submitted });
        setStatus('idle');
        setAnswered(true);
      });
      pendingHeading.current?.focus();
      request.finish(pendingEnvelope(when, result.expiresAt), true);
      track('book_request');
      return;
    }
    const envelope = isEnvelope(result.envelope)
      ? result.envelope
      : UNAVAILABLE;
    const next = failureOf(result);
    if (next === 'captcha') {
      request.retry();
    } else {
      setAnswered(true);
      request.finish(envelope, false);
    }
    flushSync(() => setStatus(next));
    alert.current?.focus();
  }

  async function onResend() {
    if (held === null) return;
    setStatus('idle');
    const failed = await again.resend(held.request);
    if (failed === null) return;
    flushSync(() => setStatus(failureOf(failed)));
    alert.current?.focus();
  }

  const alertNode = failure ? (
    <DialogAlert copy={copy} failure={failure} alertRef={alert} />
  ) : null;
  const turnstile = (
    <LazyTurnstile
      action={SURFACE_ACTION.webmcp}
      locale={locale}
      {...challenge.widgetProps}
      engaged
    />
  );

  return (
    <dialog
      ref={modal}
      onClose={onClose}
      onCancel={(event) => {
        if (request.isHeld()) event.preventDefault();
      }}
      aria-labelledby={titleId}
      aria-describedby={held ? undefined : introId}
      data-webmcp-dialog
      className="webmcp-dialog"
    >
      {held ? (
        <div className="grid gap-4" data-booking-pending>
          <BookingPending
            headingRef={pendingHeading}
            headingId={titleId}
            headingClass={H3}
            copy={copy.pending}
            label={held.when}
            email={held.request.email}
            resend={again.status}
            canResend={challenge.token !== ''}
            onResend={onResend}
          >
            {turnstile}
            {alertNode}
          </BookingPending>
          <button
            type="button"
            onClick={() => element.current?.close()}
            className={`${SECONDARY_BUTTON} w-full sm:w-fit`}
          >
            {copy.close}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="desk-mark" />
            <h2 id={titleId} className={H3}>
              {copy.title}
            </h2>
          </div>
          <p id={introId} className="webmcp-intro">
            {copy.intro}
          </p>
          <BookingWhen
            label={copy.when}
            primary={label}
            secondary={proposal.timeZone}
          />
          <BookingPerson locale={locale} />
          <fieldset
            disabled={pending || answered || challenge.busy}
            className="grid gap-5"
          >
            <BookingDetailsFields
              labels={{
                name: form.name,
                email: form.email,
                company: form.company,
                topic: form.message,
              }}
              defaults={proposal}
              topicRows={4}
            />
            <Honeypot label={form.honeypot} />
            <ConsentCheckbox
              locale={locale}
              template={form.consent}
              linkText={form.consentLink}
            />
            {turnstile}
          </fieldset>
          {alertNode}
          <div className="flex flex-wrap gap-3">
            {answered ? null : (
              <button
                type="submit"
                disabled={pending}
                aria-busy={pending || challenge.busy}
                className={PRIMARY_BUTTON}
              >
                {challenge.submitLabel(pending, {
                  idle: copy.confirm,
                  pending: copy.confirming,
                  verifying: form.verifying,
                })}
              </button>
            )}
            <p role="status" className="sr-only">
              {challenge.busy ? form.verifying : ''}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => element.current?.close()}
              className={SECONDARY_BUTTON}
            >
              {answered ? copy.close : copy.cancel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
