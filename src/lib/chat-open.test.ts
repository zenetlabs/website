import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  chatRequest,
  clearChatRequest,
  requestChat,
  subscribeChatRequest,
} from '@/lib/chat-open';

afterEach(() => {
  clearChatRequest();
});

describe('the desk-to-chat bridge', () => {
  it('starts with no request', () => {
    expect(chatRequest()).toBeNull();
  });

  it('carries the trimmed message and the element the panel grows from', () => {
    const desk = document.createElement('section');
    requestChat('  How much?  ', desk);
    expect(chatRequest()).toMatchObject({ message: 'How much?', from: desk });
  });

  it('opens an empty chat for a blank message and no origin without an element', () => {
    requestChat('   ', null);
    expect(chatRequest()).toMatchObject({ message: null, from: null });
  });

  it('gives every request a new id and tells subscribers', () => {
    const listener = vi.fn();
    const stop = subscribeChatRequest(listener);
    requestChat('a', null);
    const first = chatRequest()?.id;
    requestChat('b', null);
    expect(chatRequest()?.id).not.toBe(first);
    clearChatRequest();
    expect(chatRequest()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    requestChat('c', null);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
