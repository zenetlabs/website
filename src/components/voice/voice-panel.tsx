import { useId, useRef, useState } from 'react';
import { ContactLinks } from '@/components/contact-links';
import { LazyTurnstile } from '@/components/form-parts';
import { SECONDARY_BUTTON_SM, TEXT_LINK } from '@/components/ui';
import { useChallengeOnDemand } from '@/components/use-challenge-on-demand';
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
      : (notice.kind === 'pending' ? copy.pending : copy.opened).replace(
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
    <div className="grid gap-2">
      <p>{copy.fallbackText}</p>
      <ContactLinks
        locale={locale}
        booking={isPublished('book', SITE)}
        labels={{ book: copy.fallbackBook, form: copy.fallbackForm }}
      />
    </div>
  );
}

// The chat's one-line notice, repeated on purpose: a module shared by the two
// lazy panels costs 7 to 15 B on every budget-gated page.
function VoiceNotice({
  copy,
  locale,
  noticeId,
  open,
  onToggle,
}: {
  copy: VoiceCopy;
  locale: Locale;
  noticeId: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="chat-notice -mx-4 md:-mx-5"
      data-voice-notice={open ? 'open' : 'line'}
    >
      <p className="chat-notice-line">
        <span>{copy.noticeShort}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={noticeId}
          onClick={onToggle}
          className="chat-notice-toggle"
        >
          {copy.noticeToggle}
          <span aria-hidden="true" className="chat-chevron" />
        </button>
        <a href={pagePath(locale, 'privacy')} className={TEXT_LINK}>
          {copy.privacyLink}
        </a>
      </p>
      <p id={noticeId} hidden={!open} className="mt-2 text-pretty">
        {copy.notice}
      </p>
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
  const [noticeOpen, setNoticeOpen] = useState<boolean | null>(null);
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const challenge = useChallengeOnDemand();
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const busy = state.phase === 'connecting' || state.phase === 'live';
  // The full disclosure is open before the first call, folded once one runs.
  const notice = noticeOpen ?? state.phase === 'intro';

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
      token: challenge.token,
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
      className="voice-panel"
    >
      <div className="grid gap-4 p-4 md:p-5">
        <header className="flex items-center gap-3">
          <span aria-hidden="true" className="desk-mark" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h2
              id={titleId}
              ref={title}
              tabIndex={-1}
              className="desk-name truncate outline-hidden"
            >
              {copy.title}
            </h2>
            <span className="desk-badge">{copy.badge}</span>
          </div>
          <button
            type="button"
            aria-label={copy.close}
            onClick={() => void close()}
            className="chat-close"
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
        <VoiceNotice
          copy={copy}
          locale={locale}
          noticeId={noticeId}
          open={notice}
          onToggle={() => setNoticeOpen(!notice)}
        />
        <div className="voice-stage" data-phase={state.phase}>
          <span aria-hidden="true" className="voice-wave">
            <span className="icon icon-wave" />
          </span>
          <div className="min-w-0">
            <p
              role="status"
              className={
                statusText(copy, state) === ''
                  ? 'sr-only'
                  : 'text-ui-m font-semibold'
              }
            >
              {statusText(copy, state)}
            </p>
            {state.phase === 'intro' ? (
              <p className="text-ui-s text-fg-soft">{copy.micNote}</p>
            ) : null}
          </div>
        </div>
        {state.phase === 'intro' ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!ready}
              aria-busy={!ready}
              onClick={begin}
              className="desk-call-button"
            >
              <span aria-hidden="true" className="icon icon-phone size-5" />
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
        ) : null}
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
                // Ending while the check still runs takes its checkbox along.
                challenge.cancel();
                void endCall();
              }}
              className={SECONDARY_BUTTON_SM}
            >
              {copy.end}
            </button>
          </div>
        ) : null}
        {state.phase === 'error' && state.failure !== null ? (
          <div role="alert" className="chat-alert mt-0">
            <p className="font-semibold text-fg">
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
            className="grid max-h-56 gap-2 overflow-y-auto overscroll-contain"
          >
            {state.lines.map((line) => (
              <li
                key={line.id}
                data-ai-generated={line.role === 'agent' ? 'true' : undefined}
                data-from={line.role === 'user' ? 'user' : 'agent'}
                className="chat-msg"
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
          {...challenge.widgetProps}
          onLoad={() => setReady(true)}
          options={{ appearance: 'interaction-only', execution: 'execute' }}
        />
      </div>
    </dialog>
  );
}
