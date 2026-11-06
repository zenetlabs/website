import type { ChatPanel } from '@/components/chat/chat-panel';
import { loadChatCopy } from '@/content/load';
import type { ChatCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';

type Loaded = {
  ChatPanel: typeof ChatPanel;
  copy: ChatCopy;
};

const loads = new Map<Locale, Promise<Loaded>>();

// The panel, the AI client and the copy load on the first interaction, never at idle.
export function prefetchChat(locale: Locale): Promise<Loaded> {
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
