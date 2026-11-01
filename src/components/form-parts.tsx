import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { lazy, type ReactNode, type Ref, Suspense, useId } from 'react';
import { TEXT_LINK } from '@/components/ui';
import { BOOKING_LIMITS } from '@/lib/booking-limits';
import { legalEntity } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';

export const CONTROL =
  'w-full rounded-input border border-border bg-bg px-3.5 py-3 text-base';

export function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

type DetailKey = 'name' | 'email' | 'company' | 'topic';

// The name, email, company and topic of a booking, for the page, the chat card and the WebMCP dialog.
export function BookingDetailsFields({
  labels,
  defaults,
  topicRows,
}: {
  labels: Record<DetailKey, string>;
  defaults?: Partial<Record<DetailKey, string>>;
  topicRows: number;
}) {
  return (
    <>
      <Field label={labels.name}>
        {(id) => (
          <input
            id={id}
            name="name"
            required
            maxLength={BOOKING_LIMITS.name}
            autoComplete="name"
            defaultValue={defaults?.name}
            className={CONTROL}
          />
        )}
      </Field>
      <Field label={labels.email}>
        {(id) => (
          <input
            id={id}
            name="email"
            type="email"
            required
            maxLength={BOOKING_LIMITS.email}
            autoComplete="email"
            defaultValue={defaults?.email}
            className={CONTROL}
          />
        )}
      </Field>
      <Field label={labels.company}>
        {(id) => (
          <input
            id={id}
            name="company"
            maxLength={BOOKING_LIMITS.company}
            autoComplete="organization"
            defaultValue={defaults?.company}
            className={CONTROL}
          />
        )}
      </Field>
      <Field label={labels.topic}>
        {(id) => (
          <textarea
            id={id}
            name="topic"
            required
            minLength={BOOKING_LIMITS.topicMin}
            maxLength={BOOKING_LIMITS.topicMax}
            rows={topicRows}
            defaultValue={defaults?.topic}
            className={`${CONTROL} resize-y`}
          />
        )}
      </Field>
    </>
  );
}

// The confirmation shown once a booking is made. The caller owns the wrapper.
export function BookingSuccess({
  headingRef,
  headingId,
  headingClass,
  title,
  when,
  text,
  meetUrl,
  meet,
  meetLater,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  headingId?: string;
  headingClass: string;
  title: string;
  when: string;
  text: string;
  meetUrl: string | null;
  meet: string;
  meetLater: string;
}) {
  return (
    <>
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className={`${headingClass} outline-hidden`}
      >
        {title}
      </h2>
      <p>{when}</p>
      <p className="text-muted-fg">{text}</p>
      {meetUrl ? (
        <p>
          <a href={meetUrl} className={TEXT_LINK}>
            {meet}
          </a>
        </p>
      ) : (
        <p className="text-muted-fg">{meetLater}</p>
      )}
    </>
  );
}

export function Honeypot({ label }: { label: string }) {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        {label}
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          maxLength={200}
        />
      </label>
    </div>
  );
}

export function ConsentCheckbox({
  locale,
  template,
  linkText,
}: {
  locale: Locale;
  template: string;
  linkText: string;
}) {
  const [before, after] = template
    .replace('{legalName}', legalEntity(locale).legalName)
    .split('{privacyLink}');
  return (
    <label className="flex items-start gap-3 text-sm text-muted-fg">
      <input
        type="checkbox"
        name="consent"
        required
        className="mt-1 size-4 shrink-0 accent-accent"
      />
      <span>
        {before}
        <a href={pagePath(locale, 'privacy')} className={TEXT_LINK}>
          {linkText}
        </a>
        {after}
      </span>
    </label>
  );
}

// The widget library only loads once the visitor engages with the form.
const Turnstile = lazy(() =>
  import('@marsidev/react-turnstile').then(({ Turnstile }) => ({
    default: Turnstile,
  })),
);

export function LazyTurnstile({
  engaged,
  action,
  locale,
  instance,
  onToken,
  onError,
  onLoad,
  options,
}: {
  engaged: boolean;
  action: string;
  locale: Locale;
  instance: Ref<TurnstileInstance | undefined>;
  onToken: (token: string) => void;
  onError: () => void;
  onLoad?: () => void;
  options?: { appearance?: 'interaction-only'; execution?: 'execute' };
}) {
  if (!engaged) return null;
  return (
    <Suspense fallback={null}>
      <Turnstile
        ref={instance}
        siteKey={SITE.turnstileSiteKey}
        options={{
          action,
          theme: 'auto',
          language: locale,
          size: 'flexible',
          refreshExpired: 'auto',
          ...options,
        }}
        onWidgetLoad={onLoad}
        onSuccess={onToken}
        onExpire={() => onToken('')}
        onError={onError}
      />
    </Suspense>
  );
}

export function FormAlert({
  alertRef,
  children,
}: {
  alertRef: Ref<HTMLParagraphElement>;
  children: ReactNode;
}) {
  return (
    <p
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className="text-sm outline-hidden"
    >
      {children}{' '}
      <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
        {PUBLIC_EMAIL}
      </a>
      .
    </p>
  );
}
