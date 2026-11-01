import { useHydrated } from '@tanstack/react-router';
import { Component, type ReactNode, Suspense, use, useState } from 'react';
import type { ChatPanel } from '@/components/chat/chat-panel';
import { TEXT_LINK } from '@/components/ui';
import { loadChatCopy } from '@/content/load';
import type { ChatCopy } from '@/content/types';
import { type Locale, useLocale, useMessages } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { isPublished } from '@/lib/page-registry';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
import { track } from '@/lib/track';

type Loaded = {
  ChatPanel: typeof ChatPanel;
  copy: ChatCopy;
};

const loads = new Map<Locale, Promise<Loaded>>();

// The panel, the AI client and the copy load on the first interaction, never at idle.
function prefetchChat(locale: Locale): Promise<Loaded> {
  const known = loads.get(locale);
  if (known) return known;
  const loading = Promise.all([
    import('@/components/chat/chat-panel'),
    loadChatCopy(locale),
  ]).then(([{ ChatPanel }, copy]) => ({ ChatPanel, copy }));
  loads.set(locale, loading);
  loading.catch(() => loads.delete(locale));
  return loading;
}

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
  onClose,
}: {
  locale: Locale;
  onClose: () => void;
}) {
  const { chat } = useMessages();
  return (
    <div
      role="alert"
      className="fixed right-4 bottom-20 z-30 grid max-w-sm gap-2 rounded-card border border-border bg-bg p-4 text-sm print:hidden"
    >
      <p>{chat.unavailable}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={navHref(locale, { page: 'home', section: 'contact' })}
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

function Panel({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const { ChatPanel, copy } = use(prefetchChat(locale));
  return (
    <ChatPanel
      locale={locale}
      copy={copy}
      booking={isPublished('book', SITE)}
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
        track('chat_open');
        onOpen();
      }}
      className="fixed right-4 bottom-4 z-30 inline-flex h-14 items-center gap-2 rounded-card border border-border bg-accent px-4 text-sm font-semibold text-accent-fg motion-safe:transition-colors motion-safe:duration-200 hover:bg-accent/85 print:hidden"
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
      {chat.launcher}
    </button>
  );
}

function LauncherHost() {
  const hydrated = useHydrated();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  if (!hydrated) return null;
  return (
    <>
      <LauncherButton
        open={open}
        onOpen={() => setOpen(true)}
        locale={locale}
      />
      {open ? (
        <PanelBoundary
          fallback={
            <LoadFailed locale={locale} onClose={() => setOpen(false)} />
          }
        >
          <Suspense fallback={null}>
            <Panel locale={locale} onClose={() => setOpen(false)} />
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
