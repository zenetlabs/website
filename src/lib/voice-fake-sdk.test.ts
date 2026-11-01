import { describe, expect, it, vi } from 'vitest';
import { FAKE_VOICE_SENTINEL, fakeVoiceSdk } from '@/lib/voice-fake-sdk';
import type { VoiceEvents } from '@/lib/voice-sdk';

function events(): VoiceEvents {
  return {
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onMode: vi.fn(),
    onMessage: vi.fn(),
    onToolResult: vi.fn(),
    onError: vi.fn(),
  };
}

describe('fakeVoiceSdk', () => {
  it('refuses a token the fake ElevenLabs did not mint', async () => {
    await expect(
      fakeVoiceSdk.start({
        token: 'real-token',
        sessionId: 's',
        tools: { navigate: async () => 'opened' },
        events: events(),
      }),
    ).rejects.toThrow('fake token rejected');
  });

  it('connects, greets, and hands the page a handle to drive the call', async () => {
    const handlers = events();
    const call = await fakeVoiceSdk.start({
      token: 'fake-voice-token-4',
      sessionId: 's9',
      tools: { navigate: async () => 'opened' },
      events: handlers,
    });
    await Promise.resolve();
    expect(handlers.onConnect).toHaveBeenCalledOnce();
    expect(handlers.onMessage).toHaveBeenCalledWith(
      'agent',
      expect.any(String),
    );
    const handle = window.__voiceFake;
    expect(handle?.sentinel).toBe(FAKE_VOICE_SENTINEL);
    expect(handle?.options).toEqual({
      token: 'fake-voice-token-4',
      sessionId: 's9',
      tools: ['navigate'],
    });
    expect(await handle?.callClientTool('navigate', {})).toBe('opened');
    expect(await handle?.callClientTool('other', {})).toBe('unknown_tool');
    handle?.emitToolResult('book_meeting', '{}');
    expect(handlers.onToolResult).toHaveBeenCalledWith('book_meeting', '{}');
    await call.end();
    await call.end();
    expect(handlers.onDisconnect).toHaveBeenCalledTimes(1);
    expect(handlers.onDisconnect).toHaveBeenCalledWith('user');
  });
});
