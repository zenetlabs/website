import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { lazy, type ReactNode, type Ref, Suspense, useId } from 'react';
import { TEXT_LINK } from '@/components/ui';
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
