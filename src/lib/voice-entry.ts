import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { SITE } from '@/lib/site';

// All the page carries of voice: whether to offer it, and two calls that load
// the rest on first use. A dark build never reaches either.
export function voiceAvailable(locale: Locale): boolean {
  return __VOICE__ && SITE.voice.agents[locale] !== null;
}

export function prefetchVoice(locale: Locale): void {
  void import('@/lib/voice-open')
    .then(({ preloadVoice }) => preloadVoice(locale))
    .catch(() => undefined);
}

// A tab left open across a deploy asks for chunk files that no longer exist.
const STALE_CHUNK =
  /dynamically imported module|importing a module script failed|failed to fetch|load failed/i;

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof TypeError && STALE_CHUNK.test(error.message);
}

// A stale chunk is cured by reloading, which fetches the new ones. Anything
// else is a fault in the panel itself: the page and what the visitor typed
// stay, and the way to reach us that works without it opens instead.
export function openVoice(locale: Locale, push: (href: string) => void): void {
  void import('@/lib/voice-open')
    .then(({ mountVoice }) => mountVoice(locale, push))
    .catch((error: unknown) => {
      if (isStaleChunkError(error)) {
        location.reload();
        return;
      }
      console.error('voice: panel failed', { error: String(error) });
      location.assign(navHref(locale, { page: 'home', section: 'contact' }));
    });
}
