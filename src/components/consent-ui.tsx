import { type SyntheticEvent, useId, useRef } from 'react';
import { Container } from '@/components/section';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { ConsentCopy } from '@/content/types';
import { applyConsent } from '@/lib/analytics';
import {
  ACCEPT_ALL,
  type ConsentChoice,
  type ConsentRecord,
  REJECT_ALL,
  saveConsent,
  useConsent,
} from '@/lib/consent';
import { COOKIE_SETTINGS_ID, openCookieSettings } from '@/lib/cookie-settings';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

const SECONDARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-input border border-border px-5 py-2.5 text-sm font-semibold motion-safe:transition-colors motion-safe:duration-200 hover:bg-surface';
const CHECKBOX = 'mt-1 size-6 shrink-0 accent-accent';

function choose(gaId: string, choice: ConsentChoice): void {
  const now = Date.now();
  applyConsent(gaId, saveConsent(choice, now), now);
  document.getElementById('main')?.focus({ preventScroll: true });
}

function ConsentBanner({
  gaId,
  copy,
  locale,
}: {
  gaId: string;
  copy: ConsentCopy;
  locale: Locale;
}) {
  return (
    <section
      data-consent-banner
      aria-label={copy.title}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface print:hidden"
    >
      <Container className="grid gap-2 py-2.5 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:py-4">
        <p className="max-w-3xl text-sm leading-snug text-muted-fg">
          {copy.text}
        </p>
        <div className="grid gap-1 md:justify-items-end">
          <div className="grid grid-cols-2 gap-3 md:w-96">
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => choose(gaId, REJECT_ALL)}
            >
              {copy.reject}
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => choose(gaId, ACCEPT_ALL)}
            >
              {copy.accept}
            </button>
          </div>
          <div className="flex flex-wrap gap-x-5 text-sm">
            <button
              type="button"
              className={`${TEXT_LINK} py-1`}
              onClick={openCookieSettings}
            >
              {copy.settings}
            </button>
            <a
              href={pagePath(locale, 'cookies')}
              className={`${TEXT_LINK} py-1`}
            >
              {copy.policy}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ToggleRow({
  name,
  label,
  text,
  checked,
}: {
  name: string;
  label: string;
  text: string;
  checked: boolean;
}) {
  const id = useId();
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-hairline py-4">
      <span>
        <span id={`${id}-name`} className="block font-semibold">
          {label}
        </span>
        <span id={`${id}-text`} className="mt-1 block text-sm text-muted-fg">
          {text}
        </span>
      </span>
      <input
        type="checkbox"
        name={name}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-text`}
        defaultChecked={checked}
        className={CHECKBOX}
      />
    </label>
  );
}

function ConsentSettings({
  gaId,
  copy,
  consent,
}: {
  gaId: string;
  copy: ConsentCopy;
  consent: ConsentRecord | null;
}) {
  const { dialog } = copy;
  const dialogRef = useRef<HTMLDialogElement>(null);

  function finish(choice?: ConsentChoice) {
    dialogRef.current?.close();
    if (choice) choose(gaId, choice);
  }

  function reset(event: SyntheticEvent<HTMLDialogElement>) {
    event.currentTarget.querySelector('form')?.reset();
  }

  return (
    <dialog
      ref={dialogRef}
      id={COOKIE_SETTINGS_ID}
      aria-labelledby="consent-settings-title"
      onClose={reset}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-card border border-border bg-bg p-6 text-fg backdrop:bg-bg/80"
    >
      <form
        key={consent?.at ?? 0}
        action={(data) => {
          finish({
            analytics: data.get('analytics') !== null,
            marketing: data.get('marketing') !== null,
          });
        }}
      >
        <h2
          id="consent-settings-title"
          className="font-sans text-base font-semibold"
        >
          {dialog.title}
        </h2>
        <p className="mt-2 text-sm text-muted-fg">{dialog.intro}</p>
        <div className="mt-4">
          <div className="flex items-start justify-between gap-4 border-t border-hairline py-4">
            <div>
              <p className="font-semibold">{dialog.necessary}</p>
              <p className="mt-1 text-sm text-muted-fg">
                {dialog.necessaryText}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium">
              {dialog.alwaysOn}
            </span>
          </div>
          <ToggleRow
            name="analytics"
            label={dialog.analytics}
            text={dialog.analyticsText}
            checked={consent?.analytics ?? false}
          />
          <ToggleRow
            name="marketing"
            label={dialog.marketing}
            text={dialog.marketingText}
            checked={consent?.marketing ?? false}
          />
        </div>
        <div className="grid gap-3 border-t border-hairline pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => finish(REJECT_ALL)}
            >
              {copy.reject}
            </button>
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() => finish(ACCEPT_ALL)}
            >
              {copy.accept}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="submit" className={SECONDARY_BUTTON}>
              {dialog.save}
            </button>
            <button
              type="button"
              className={SECONDARY_BUTTON}
              onClick={() => finish()}
            >
              {dialog.close}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}

export function ConsentUi({
  gaId,
  copy,
  locale,
}: {
  gaId: string;
  copy: ConsentCopy;
  locale: Locale;
}) {
  const consent = useConsent();
  if (consent === undefined) return null;

  return (
    <>
      {consent === null ? (
        <ConsentBanner gaId={gaId} copy={copy} locale={locale} />
      ) : null}
      <ConsentSettings gaId={gaId} copy={copy} consent={consent} />
    </>
  );
}
