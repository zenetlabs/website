import { useHydrated, useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { type Locale, useLocale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { isPlainClick } from '@/lib/plain-click';
import { type CtaId, track } from '@/lib/track';
import { openVoice, prefetchVoice, voiceAvailable } from '@/lib/voice-entry';

// A call door that is a real link at first paint: without JavaScript (or
// before hydration) it goes to the contact page; once hydrated it starts the
// call in place. Rendered only while voice is published, so nothing shifts.
export function CallLink({
  locale,
  cta,
  className,
  children,
}: {
  locale: Locale;
  cta: CtaId;
  className: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const prefetch = () => prefetchVoice(locale);
  return (
    <a
      href={navHref(locale, { page: 'contact' })}
      data-cta={cta}
      data-voice-button
      aria-haspopup={hydrated ? 'dialog' : undefined}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={(event) => {
        track('cta_click', { cta_id: cta });
        if (!hydrated || !isPlainClick(event)) return;
        event.preventDefault();
        openVoice(locale, (href) => router.history.push(href));
      }}
      className={className}
    >
      {children}
    </a>
  );
}

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
        <span aria-hidden="true" className="icon icon-phone size-5" />
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
