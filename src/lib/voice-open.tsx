import { createRoot, type Root } from 'react-dom/client';
import { VoicePanel } from '@/components/voice/voice-panel';
import { loadVoiceCopy } from '@/content/load';
import type { VoiceCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';

type Mounted = { root: Root; node: HTMLElement; opener: HTMLElement | null };

const copies = new Map<Locale, Promise<VoiceCopy>>();
let mounted: Mounted | null = null;
let opening = false;

function copyFor(locale: Locale): Promise<VoiceCopy> {
  const known = copies.get(locale);
  if (known) return known;
  const loading = loadVoiceCopy(locale);
  copies.set(locale, loading);
  loading.catch(() => copies.delete(locale));
  return loading;
}

export async function preloadVoice(locale: Locale): Promise<void> {
  await copyFor(locale);
}

function unmount(): void {
  const current = mounted;
  mounted = null;
  if (!current) return;
  current.root.unmount();
  current.node.remove();
  if (current.opener?.isConnected) current.opener.focus();
}

// The panel lives in its own React root on a node appended to the body, so a
// page that never opens it carries no host, and a call keeps its language when
// the page's changes. A locale is fixed when the panel opens.
export async function mountVoice(
  locale: Locale,
  push: (href: string) => void,
): Promise<void> {
  if (mounted || opening) return;
  opening = true;
  const opener =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  try {
    const copy = await copyFor(locale);
    const node = document.createElement('div');
    document.body.appendChild(node);
    const root = createRoot(node);
    mounted = { root, node, opener };
    root.render(
      <VoicePanel locale={locale} copy={copy} push={push} onClose={unmount} />,
    );
  } finally {
    opening = false;
  }
}
