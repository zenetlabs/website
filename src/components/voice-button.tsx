import { useHydrated, useRouter } from '@tanstack/react-router';
import { useLocale } from '@/lib/i18n';
import { openVoice, prefetchVoice, voiceAvailable } from '@/lib/voice-entry';

type CalloutProps = { text: string; button: string };

function Callout({ text, button }: CalloutProps) {
  const hydrated = useHydrated();
  const locale = useLocale();
  const router = useRouter();
  if (!hydrated || !voiceAvailable(locale)) return null;
  const prefetch = () => prefetchVoice(locale);
  return (
    <div className="mt-8 grid max-w-md gap-4">
      <p className="text-ui-m text-muted-fg">{text}</p>
      <button
        type="button"
        data-voice-button
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        onClick={() => openVoice(locale, (href) => router.history.push(href))}
        className="voice-door"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        </svg>
        {button}
      </button>
    </div>
  );
}

// Shown only after hydration: without JavaScript the button could do nothing,
// and the mail and form beside it stay. A dark build folds it all away.
export function VoiceCallout(props: CalloutProps) {
  return __VOICE__ ? <Callout {...props} /> : null;
}
