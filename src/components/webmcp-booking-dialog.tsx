import {
  type FormEvent,
  type Ref,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { BookingPending } from '@/components/booking-pending';
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
  const challenge = useChallenge();
  const [status, setStatus] = useState<Status>('idle');
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
    if (!request.isHeld()) {
      request.dismiss();
      return;
    }
    if (element.current?.open === false) element.current.showModal();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // A synthetic submit skips the browser's own required check.
    if (data.get('consent') !== 'on') return;
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
      turnstileToken: challenge.token,
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
      engaged
      action={SURFACE_ACTION.webmcp}
      locale={locale}
      instance={challenge.instance}
      onToken={challenge.setToken}
      onError={() => {
        challenge.setToken('');
        setStatus('captcha');
      }}
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
      className="fixed inset-0 m-auto h-fit max-h-[90dvh] w-[min(100%-2rem,32rem)] overflow-y-auto rounded-card border border-border bg-surface p-6 text-fg shadow-raised backdrop:bg-bg/60"
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
          <h2 id={titleId} className={H3}>
            {copy.title}
          </h2>
          <p id={introId} className="text-ui-s text-muted-fg">
            {copy.intro}
          </p>
          <p className="text-ui-m">
            <span className="font-medium">{copy.when}: </span>
            {label} · {proposal.timeZone}
          </p>
          <fieldset disabled={pending || answered} className="grid gap-5">
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
                disabled={challenge.token === '' || pending}
                className={PRIMARY_BUTTON}
              >
                {pending ? copy.confirming : copy.confirm}
              </button>
            )}
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
