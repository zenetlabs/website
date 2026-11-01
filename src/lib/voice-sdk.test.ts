import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadVoiceSdk, type VoiceEvents } from '@/lib/voice-sdk';

const startSession = vi.hoisted(() => vi.fn());
vi.mock('@elevenlabs/client', () => ({
  VoiceConversation: { startSession },
}));

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

const endSession = vi.fn(async () => undefined);
const setMicMuted = vi.fn();

beforeEach(() => {
  startSession.mockReset().mockResolvedValue({ endSession, setMicMuted });
  endSession.mockClear();
  setMicMuted.mockClear();
});

describe('loadVoiceSdk', () => {
  it('starts a WebRTC session with the token, only the session variable and only the navigate tool', async () => {
    const sdk = await loadVoiceSdk();
    const navigate = vi.fn(async () => 'opened');
    await sdk.start({
      token: 'conversation-token',
      sessionId: 'session-1',
      tools: { navigate },
      events: events(),
    });
    const options = startSession.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      conversationToken: 'conversation-token',
      connectionType: 'webrtc',
      dynamicVariables: { secret__zl_session: 'session-1' },
    });
    expect(Object.keys(options.dynamicVariables)).toEqual([
      'secret__zl_session',
    ]);
    expect(Object.keys(options.clientTools)).toEqual(['navigate']);
    expect(options).not.toHaveProperty('overrides');
    expect(options).not.toHaveProperty('agentId');
    expect(options).not.toHaveProperty('signedUrl');
  });

  it('maps the SDK callbacks to ours and forwards only full tool results', async () => {
    const sdk = await loadVoiceSdk();
    const handlers = events();
    await sdk.start({
      token: 't',
      sessionId: 's',
      tools: { navigate: async () => 'opened' },
      events: handlers,
    });
    const options = startSession.mock.calls[0]?.[0];
    options.onConnect({ conversationId: 'c' });
    options.onDisconnect({ reason: 'agent' });
    options.onModeChange({ mode: 'speaking' });
    options.onMessage({ role: 'user', message: 'hi' });
    options.onError('boom');
    options.onAgentToolResponse({ tool_name: 'x', is_error: false });
    options.onAgentToolResponse({
      tool_name: 'book_meeting',
      full_tool_result: '{}',
    });
    expect(handlers.onConnect).toHaveBeenCalledOnce();
    expect(handlers.onDisconnect).toHaveBeenCalledWith('agent');
    expect(handlers.onMode).toHaveBeenCalledWith('speaking');
    expect(handlers.onMessage).toHaveBeenCalledWith('user', 'hi');
    expect(handlers.onError).toHaveBeenCalledOnce();
    expect(handlers.onToolResult).toHaveBeenCalledTimes(1);
    expect(handlers.onToolResult).toHaveBeenCalledWith('book_meeting', '{}');
  });

  it('ends the call and mutes the microphone through the conversation', async () => {
    const sdk = await loadVoiceSdk();
    const call = await sdk.start({
      token: 't',
      sessionId: 's',
      tools: { navigate: async () => 'opened' },
      events: events(),
    });
    call.setMuted(true);
    await call.end();
    expect(setMicMuted).toHaveBeenCalledWith(true);
    expect(endSession).toHaveBeenCalledOnce();
  });
});
