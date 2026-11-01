import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useId, useRef, useState } from 'react';
import { ContactLinks } from '@/components/contact-links';
import { LazyTurnstile } from '@/components/form-parts';
import {
  PRIMARY_BUTTON,
  SECONDARY_BUTTON_SM,
  TEXT_LINK,
} from '@/components/ui';
import { challengeToken } from '@/components/use-challenge';
import type { VoiceCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isPublished, pagePath } from '@/lib/page-registry';
import { SITE } from '@/lib/site';
import { noop } from '@/lib/time';
import { requestMic, voiceSupported } from '@/lib/voice-device';
import {
  endCall,
  resetCall,
  startCall,
  toggleMute,
  useVoiceState,
  type VoiceFailure,
  type VoiceState,
  warmSdk,
} from '@/lib/voice-store';

function failureText(copy: VoiceCopy, failure: VoiceFailure): string {
  switch (failure) {
    case 'mic':
      return copy.micDenied;
    case 'unsupported':
      return copy.unsupported;
    case 'budget':
      return copy.errorBudget;
    case 'rate':
      return copy.errorRate;
    case 'captcha':
      return copy.errorCaptcha;
    default:
      return copy.errorCall;
  }
}

function statusText(copy: VoiceCopy, state: VoiceState): string {
  const { notice } = state;
  const noticeText =
    notice === null
      ? ''
      : (notice.kind === 'booked' ? copy.booked : copy.opened).replace(
          '{label}',
          notice.label,
        );
  if (state.phase === 'connecting') return copy.connecting;
  if (state.phase === 'ended') {
    return [noticeText, copy.ended].filter(Boolean).join(' ');
  }
  if (state.phase !== 'live') return '';
  if (noticeText !== '') return noticeText;
  return state.mode === 'speaking' ? copy.speaking : copy.listening;
}

function Fallback({ locale, copy }: { locale: Locale; copy: VoiceCopy }) {
  return (
    <div className="grid gap-2 text-sm">
      <p>{copy.fallbackText}</p>
      <ContactLinks
        locale={locale}
        booking={isPublished('book', SITE)}
        labels={{ book: copy.fallbackBook, form: copy.fallbackForm }}
      />
    </div>
  );
}

export function VoicePanel({
  locale,
  copy,
  push,
  onClose,
}: {
  locale: Locale;
  copy: VoiceCopy;
  push: (href: string) => void;
  onClose: () => void;
}) {
  const state = useVoiceState();
  const [ready, setReady] = useState(false);
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const widget = useRef<TurnstileInstance>(undefined);
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const busy = state.phase === 'connecting' || state.phase === 'live';

  // The button that was pressed leaves the page with its state, so focus goes
  // to the title, which stays and keeps Escape working from the keyboard.
  function focusTitle() {
    title.current?.focus();
  }

  function begin() {
    focusTitle();
    void startCall({
      locale,
      page: location.pathname,
      timeZone: zone,
      copy,
      supported: voiceSupported,
      requestMic,
      token: challengeToken(widget),
      push,
    });
  }

  async function close() {
    await resetCall();
    onClose();
  }

  return (
    <dialog
      ref={(element) => {
        if (element && !element.open) {
          element.show();
          warmSdk().catch(noop);
          focusTitle();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          void close();
        }
      }}
      aria-labelledby={titleId}
      aria-describedby={noticeId}
      data-voice-panel
      data-voice-state={state.phase}
      className="fixed inset-x-0 bottom-0 z-40 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-border bg-bg p-0 text-fg md:inset-auto md:right-4 md:bottom-4 md:w-[26rem] md:rounded-card print:hidden"
    >
      <div className="grid gap-3 p-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2
              id={titleId}
              ref={title}
              tabIndex={-1}
              className="font-sans text-base font-semibold leading-snug tracking-normal outline-hidden"
            >
              {copy.title}
            </h2>
            <span className="rounded-input border border-border px-1.5 py-0.5 font-mono text-xs">
              {copy.badge}
            </span>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => void close()}
            className="inline-flex size-11 items-center justify-center rounded-input hover:bg-surface"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <p id={noticeId} className="text-xs leading-snug text-muted-fg">
          {copy.notice}{' '}
          <a href={pagePath(locale, 'privacy')} className={TEXT_LINK}>
            {copy.privacyLink}
          </a>
        </p>
        {state.phase === 'intro' ? (
          <>
            <p className="text-xs text-muted-fg">{copy.micNote}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!ready}
                onClick={begin}
                className={PRIMARY_BUTTON}
              >
                {copy.start}
              </button>
              <button
                type="button"
                onClick={() => void close()}
                className={SECONDARY_BUTTON_SM}
              >
                {copy.cancel}
              </button>
            </div>
          </>
        ) : null}
        <p role="status" className="min-h-5 text-sm">
          {statusText(copy, state)}
        </p>
        {busy ? (
          <div className="flex flex-wrap gap-2">
            {state.phase === 'live' ? (
              <button
                type="button"
                aria-pressed={state.muted}
                onClick={toggleMute}
                className={SECONDARY_BUTTON_SM}
              >
                {state.muted ? copy.unmute : copy.mute}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                focusTitle();
                void endCall();
              }}
              className={SECONDARY_BUTTON_SM}
            >
              {copy.end}
            </button>
          </div>
        ) : null}
        {state.phase === 'error' && state.failure !== null ? (
          <div
            role="alert"
            className="grid gap-3 rounded-card border border-border p-3"
          >
            <p className="text-sm font-medium">
              {failureText(copy, state.failure)}
            </p>
            <Fallback locale={locale} copy={copy} />
            <button
              type="button"
              onClick={() => {
                focusTitle();
                void resetCall();
              }}
              className={`${SECONDARY_BUTTON_SM} justify-self-start`}
            >
              {copy.again}
            </button>
          </div>
        ) : null}
        {state.phase === 'ended' ? (
          <button
            type="button"
            onClick={() => {
              focusTitle();
              void resetCall();
            }}
            className={`${SECONDARY_BUTTON_SM} justify-self-start`}
          >
            {copy.again}
          </button>
        ) : null}
        {state.lines.length > 0 ? (
          <ol
            aria-label={copy.transcript}
            className="grid max-h-56 gap-2 overflow-y-auto text-sm"
          >
            {state.lines.map((line) => (
              <li
                key={line.id}
                data-ai-generated={line.role === 'agent' ? 'true' : undefined}
                className={`max-w-[90%] rounded-card px-3 py-2 ${line.role === 'user' ? 'ml-auto bg-accent text-accent-fg' : 'bg-surface'}`}
              >
                <span className="sr-only">
                  {line.role === 'user' ? copy.you : copy.assistant}:{' '}
                </span>
                {line.text}
              </li>
            ))}
          </ol>
        ) : null}
        <LazyTurnstile
          engaged
          action="voice"
          locale={locale}
          instance={widget}
          onToken={noop}
          onError={noop}
          onLoad={() => setReady(true)}
          options={{ appearance: 'interaction-only', execution: 'execute' }}
        />
      </div>
    </dialog>
  );
}
