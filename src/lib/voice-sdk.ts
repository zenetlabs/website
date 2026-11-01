import { VOICE_SESSION_VARIABLE } from '@/lib/voice-client';

export type VoiceEnd = 'user' | 'agent' | 'error';

// What the panel needs from a voice SDK, so the real one, the scripted one and
// the tests are interchangeable and only this file knows ElevenLabs' types.
export type VoiceEvents = {
  onConnect: () => void;
  onDisconnect: (reason: VoiceEnd) => void;
  onMode: (mode: 'listening' | 'speaking') => void;
  onMessage: (role: 'user' | 'agent', text: string) => void;
  // The full result of a webhook tool the agent ran.
  onToolResult: (name: string, result: string) => void;
  onError: () => void;
};

export type VoiceStart = {
  token: string;
  sessionId: string;
  tools: { navigate: (params: unknown) => Promise<string> };
  events: VoiceEvents;
};

export type VoiceCall = {
  end: () => Promise<void>;
  setMuted: (muted: boolean) => void;
};

export type VoiceSdk = { start: (options: VoiceStart) => Promise<VoiceCall> };

// The SDK (about 170 KB gzip with LiveKit) loads when the panel opens, never
// with a page. Only this function names it.
export async function loadVoiceSdk(): Promise<VoiceSdk> {
  if (__VOICE_FAKE__)
    return (await import('@/lib/voice-fake-sdk')).fakeVoiceSdk;
  const { VoiceConversation } = await import('@elevenlabs/client');
  return {
    async start({ token, sessionId, tools, events }) {
      const conversation = await VoiceConversation.startSession({
        conversationToken: token,
        connectionType: 'webrtc',
        dynamicVariables: { [VOICE_SESSION_VARIABLE]: sessionId },
        clientTools: tools,
        onConnect: () => events.onConnect(),
        onDisconnect: (details) => events.onDisconnect(details.reason),
        onModeChange: ({ mode }) => events.onMode(mode),
        onMessage: ({ role, message }) => events.onMessage(role, message),
        onAgentToolResponse: (response) => {
          if ('full_tool_result' in response) {
            events.onToolResult(response.tool_name, response.full_tool_result);
          }
        },
        onError: () => events.onError(),
      });
      return {
        end: () => conversation.endSession(),
        setMuted: (muted) => conversation.setMicMuted(muted),
      };
    },
  };
}
