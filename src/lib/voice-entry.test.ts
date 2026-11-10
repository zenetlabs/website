import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE } from '@/lib/site';
import { openVoice, prefetchVoice } from '@/lib/voice-entry';

const mountVoice = vi.hoisted(() => vi.fn(async () => undefined));
const preloadVoice = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/lib/voice-open', () => ({ mountVoice, preloadVoice }));

beforeEach(() => {
  mountVoice.mockClear();
  preloadVoice.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// A build with its own voice flag and agents, whatever production holds.
async function availability(
  voice: boolean,
  agents: Record<'en' | 'es', string | null>,
) {
  vi.stubGlobal('__VOICE__', voice);
  vi.stubGlobal('__SITE__', {
    ...SITE,
    voice: { ...SITE.voice, published: voice, agents },
  });
  vi.resetModules();
  const { voiceAvailable } = await import('@/lib/voice-entry');
  return { en: voiceAvailable('en'), es: voiceAvailable('es') };
}

const AGENTS = { en: 'agent_test_en', es: 'agent_test_es' };

describe('voice-entry', () => {
  it('is available in both locales once voice is published', async () => {
    expect(await availability(true, AGENTS)).toEqual({ en: true, es: true });
  });

  it('is unavailable while voice is dark', async () => {
    expect(await availability(false, AGENTS)).toEqual({
      en: false,
      es: false,
    });
  });

  it('is unavailable in a locale whose agent is null, even when published', async () => {
    expect(await availability(true, { ...AGENTS, es: null })).toEqual({
      en: true,
      es: false,
    });
  });

  it('loads the panel code on first use only, and hands it the locale and the push', async () => {
    const push = vi.fn();
    openVoice('es', push);
    await vi.waitFor(() => expect(mountVoice).toHaveBeenCalledWith('es', push));
  });

  it('prefetches the copy of a locale', async () => {
    prefetchVoice('en');
    await vi.waitFor(() => expect(preloadVoice).toHaveBeenCalledWith('en'));
  });

  it.each([
    'Failed to fetch dynamically imported module: /assets/voice-open-x.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
  ])('reloads the page on a stale chunk (%s)', async (message) => {
    const reload = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload, assign });
    mountVoice.mockRejectedValueOnce(new TypeError(message));
    openVoice('en', vi.fn());
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(assign).not.toHaveBeenCalled();
  });

  it('sends the visitor to the contact page, not a reload, when the panel itself fails', async () => {
    const reload = vi.fn();
    const assign = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('location', { ...window.location, reload, assign });
    mountVoice.mockRejectedValueOnce(new Error('render failed'));
    openVoice('es', vi.fn());
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/es/contacto'));
    expect(reload).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
