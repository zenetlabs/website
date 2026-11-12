import { type SyntheticEvent, useId, useRef, useState } from 'react';
import { Container } from '@/components/section';
import {
  SECONDARY_BUTTON,
  SECONDARY_BUTTON_SM,
  TEXT_LINK,
} from '@/components/ui';
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

const CHECKBOX = 'size-6 accent-accent';

function trackBannerHeight(node: HTMLElement): () => void {
  const root = document.documentElement;
  const publish = () => {
    root.style.setProperty(
      '--consent-reserve',
      `${Math.ceil(node.getBoundingClientRect().height)}px`,
    );
  };
  publish();
  const observer = new ResizeObserver(publish);
  observer.observe(node);
  return () => {
    observer.disconnect();
    root.style.removeProperty('--consent-reserve');
  };
}

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
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const titleId = `${id}-title`;
  const textId = `${id}-text`;
  return (
    <section
      ref={trackBannerHeight}
      data-consent-banner
      aria-labelledby={titleId}
      aria-describedby={textId}
      className="fixed inset-x-0 bottom-0 z-20 max-h-[70dvh] overflow-y-auto border-t border-hairline bg-surface shadow-raised print:hidden"
    >
      <Container className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:py-4">
        <div>
          <h2 id={titleId} className="text-ui-m">
            {copy.title}
          </h2>
          <p className="mt-1 max-w-3xl text-ui-s text-fg-soft">
            <span id={textId}>
              <span className={expanded ? 'hidden' : 'sm:hidden'}>
                {copy.textShort}
              </span>
              <span className={expanded ? undefined : 'hidden sm:inline'}>
                {copy.text}
              </span>
            </span>{' '}
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={textId}
              onClick={() => setExpanded((value) => !value)}
              className={`${TEXT_LINK} sm:hidden`}
            >
              {expanded ? copy.less : copy.more}
            </button>{' '}
            <a href={pagePath(locale, 'cookies')} className={TEXT_LINK}>
              {copy.policy}
            </a>
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:w-[28rem] md:gap-3">
          <button
            type="button"
            className={SECONDARY_BUTTON_SM}
            onClick={() => choose(gaId, REJECT_ALL)}
          >
            {copy.reject}
          </button>
          <button
            type="button"
            className={SECONDARY_BUTTON_SM}
            onClick={openCookieSettings}
          >
            {copy.settings}
          </button>
          <button
            type="button"
            className={SECONDARY_BUTTON_SM}
            onClick={() => choose(gaId, ACCEPT_ALL)}
          >
            {copy.accept}
          </button>
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
        <span id={`${id}-name`} className="block text-ui-m font-semibold">
          {label}
        </span>
        <span id={`${id}-text`} className="mt-1 block text-ui-s text-fg-soft">
          {text}
        </span>
      </span>
      <span className="-mt-2.5 -mr-2.5 grid size-11 shrink-0 place-items-center">
        <input
          type="checkbox"
          name={name}
          aria-labelledby={`${id}-name`}
          aria-describedby={`${id}-text`}
          defaultChecked={checked}
          className={CHECKBOX}
        />
      </span>
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
      className="consent-dialog"
    >
      <form
        key={consent?.at ?? 0}
        action={(data) => {
          finish({
            analytics: data.get('analytics') !== null,
            attribution: data.get('attribution') !== null,
          });
        }}
      >
        <h2 id="consent-settings-title" className="text-h3">
          {dialog.title}
        </h2>
        <p className="mt-2 text-ui-s text-fg-soft">{dialog.intro}</p>
        <div className="mt-4">
          <div className="flex items-start justify-between gap-4 border-t border-hairline py-4">
            <div>
              <p className="text-ui-m font-semibold">{dialog.necessary}</p>
              <p className="mt-1 text-ui-s text-fg-soft">
                {dialog.necessaryText}
              </p>
            </div>
            <span className="shrink-0 text-ui-s font-semibold">
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
            name="attribution"
            label={dialog.attribution}
            text={dialog.attributionText}
            checked={consent?.attribution ?? false}
          />
        </div>
        <div className="sticky bottom-0 -mx-6 -mb-6 grid gap-3 border-t border-hairline bg-surface px-6 pt-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={SECONDARY_BUTTON}
              onClick={() => finish(REJECT_ALL)}
            >
              {copy.reject}
            </button>
            <button
              type="button"
              className={SECONDARY_BUTTON}
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
