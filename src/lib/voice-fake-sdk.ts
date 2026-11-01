import type { VoiceSdk, VoiceStart } from '@/lib/voice-sdk';

// Stands in for ElevenLabs in local runs and CI. A production build must not
// contain the sentinel below (deploy-prod greps for it).
export const FAKE_VOICE_SENTINEL = 'FAKE_VOICE_SENTINEL';

const TOKEN_PREFIX = 'fake-voice-token-';
const GREETING = 'Hi, this is the scripted voice assistant.';

type VoiceFakeHandle = {
  sentinel: string;
  options: { token: string; sessionId: string; tools: string[] };
  callClientTool: (name: string, params: unknown) => Promise<string>;
  emitToolResult: (name: string, result: string) => void;
  disconnect: (reason: 'user' | 'agent' | 'error') => void;
};

declare global {
  interface Window {
    __voiceFake?: VoiceFakeHandle;
  }
}

export const fakeVoiceSdk: VoiceSdk = {
  async start({ token, sessionId, tools, events }: VoiceStart) {
    if (!token.startsWith(TOKEN_PREFIX)) throw new Error('fake token rejected');
    let open = true;
    const end = (reason: 'user' | 'agent' | 'error') => {
      if (!open) return;
      open = false;
      events.onDisconnect(reason);
    };
    window.__voiceFake = {
      sentinel: FAKE_VOICE_SENTINEL,
      options: { token, sessionId, tools: Object.keys(tools) },
      callClientTool: (name, params) =>
        name === 'navigate'
          ? tools.navigate(params)
          : Promise.resolve('unknown_tool'),
      emitToolResult: events.onToolResult,
      disconnect: end,
    };
    queueMicrotask(() => {
      events.onConnect();
      events.onMessage('agent', GREETING);
      events.onMode('listening');
    });
    return {
      end: async () => end('user'),
      setMuted: () => undefined,
    };
  },
};
