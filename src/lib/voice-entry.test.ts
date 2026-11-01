import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openVoice, prefetchVoice, voiceAvailable } from '@/lib/voice-entry';

const mountVoice = vi.hoisted(() => vi.fn(async () => undefined));
const preloadVoice = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@/lib/voice-open', () => ({ mountVoice, preloadVoice }));

beforeEach(() => {
  mountVoice.mockClear();
  preloadVoice.mockClear();
});

describe('voice-entry', () => {
  it('is unavailable while voice is dark', () => {
    expect(voiceAvailable('en')).toBe(false);
    expect(voiceAvailable('es')).toBe(false);
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
    vi.unstubAllGlobals();
  });

  it('opens the contact section, without a reload, when the panel itself fails', async () => {
    const reload = vi.fn();
    const assign = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('location', { ...window.location, reload, assign });
    mountVoice.mockRejectedValueOnce(new Error('render failed'));
    openVoice('es', vi.fn());
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/es#contact'));
    expect(reload).not.toHaveBeenCalled();
    log.mockRestore();
    vi.unstubAllGlobals();
  });
});
