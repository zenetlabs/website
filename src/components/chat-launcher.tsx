import { useHydrated } from '@tanstack/react-router';
import {
  Component,
  type ReactNode,
  Suspense,
  use,
  useState,
  useSyncExternalStore,
} from 'react';
import { TEXT_LINK } from '@/components/ui';
import {
  type ChatRequest,
  chatRequest,
  clearChatRequest,
  noChatRequest,
  subscribeChatRequest,
} from '@/lib/chat-open';
import { prefetchChat } from '@/lib/chat-prefetch';
import { type Locale, useLocale, useMessages } from '@/lib/i18n';
import { contactWithMessage, navHref } from '@/lib/nav';
import { isPublished } from '@/lib/page-registry';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
import { track } from '@/lib/track';

// A tab left open across a deploy asks for chunk files that no longer exist.
// The panel then fails to load, and a visitor must still be able to reach us.
export class PanelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LoadFailed({
  locale,
  message,
  onClose,
}: {
  locale: Locale;
  message: string | null;
  onClose: () => void;
}) {
  const { chat } = useMessages();
  return (
    <div
      role="alert"
      className="fixed right-6 bottom-20 z-30 grid max-w-sm gap-2 rounded-card border border-hairline bg-surface p-5 text-ui-s shadow-raised print:hidden"
    >
      <p>{chat.unavailable}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={
            message === null
              ? navHref(locale, { page: 'contact' })
              : contactWithMessage(locale, message)
          }
          className={TEXT_LINK}
        >
          {chat.contact}
        </a>
        <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
          {PUBLIC_EMAIL}
        </a>
      </p>
      <button type="button" onClick={onClose} className={TEXT_LINK}>
        {chat.close}
      </button>
    </div>
  );
}

function Panel({
  locale,
  request,
  onClose,
}: {
  locale: Locale;
  request: ChatRequest | null;
  onClose: () => void;
}) {
  const { ChatPanel, copy } = use(prefetchChat(locale));
  return (
    <ChatPanel
      locale={locale}
      copy={copy}
      booking={isPublished('book', SITE)}
      initialMessage={request?.message ?? null}
      from={request?.from ?? null}
      onClose={onClose}
    />
  );
}

export function LauncherButton({
  open,
  onOpen,
  locale,
}: {
  open: boolean;
  onOpen: () => void;
  locale: Locale;
}) {
  const { chat } = useMessages();
  const prefetch = () => {
    void prefetchChat(locale).catch(() => undefined);
  };
  return (
    <button
      type="button"
      data-chat-launcher
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={chat.launcherLabel}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      onTouchStart={prefetch}
      onClick={() => {
        track('chat_open', { entry: 'launcher' });
        onOpen();
      }}
      className="launcher"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
      <span className="max-lg:sr-only">{chat.launcher}</span>
    </button>
  );
}

function LauncherHost() {
  const hydrated = useHydrated();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  // The home desk opens the same panel, with the visitor's first message.
  const request = useSyncExternalStore(
    subscribeChatRequest,
    chatRequest,
    noChatRequest,
  );
  const shown = open || request !== null;
  const close = () => {
    setOpen(false);
    clearChatRequest();
  };
  if (!hydrated) return null;
  return (
    <>
      <LauncherButton
        open={shown}
        onOpen={() => setOpen(true)}
        locale={locale}
      />
      {shown ? (
        // Keyed by the request, so a new question after a failed load tries
        // again instead of showing the old failure.
        <PanelBoundary
          key={request?.id ?? 0}
          fallback={
            <LoadFailed
              locale={locale}
              message={request?.message ?? null}
              onClose={close}
            />
          }
        >
          <Suspense fallback={null}>
            <Panel locale={locale} request={request} onClose={close} />
          </Suspense>
        </PanelBoundary>
      ) : null}
    </>
  );
}

// Dark builds carry none of this: the constant folds away the branch and the
// dynamic imports with it. Without JavaScript there is no launcher; the contact
// form and the mailto links on the page stay.
export function ChatLauncher() {
  return __ASSISTANT__ ? <LauncherHost /> : null;
}
