import { useHydrated, useRouter } from '@tanstack/react-router';
import { SECONDARY_BUTTON } from '@/components/ui';
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
    <div className="mt-8 grid max-w-md gap-3">
      <p className="text-muted-fg">{text}</p>
      <button
        type="button"
        data-voice-button
        aria-haspopup="dialog"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        onTouchStart={prefetch}
        onClick={() => openVoice(locale, (href) => router.history.push(href))}
        className={`${SECONDARY_BUTTON} justify-self-start gap-2`}
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
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
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
