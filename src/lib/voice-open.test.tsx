import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountVoice, preloadVoice } from '@/lib/voice-open';

const panel = vi.hoisted(() => ({ onClose: () => {} }));

vi.mock('@/components/voice/voice-panel', () => ({
  VoicePanel: ({
    locale,
    copy,
    onClose,
  }: {
    locale: string;
    copy: { title: string };
    onClose: () => void;
  }) => {
    panel.onClose = onClose;
    return (
      <div data-testid="panel">
        {locale}:{copy.title}
      </div>
    );
  },
}));

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(async () => {
  await act(async () => panel.onClose());
});

describe('mountVoice', () => {
  it('mounts one panel on its own node with the locale copy, and a second call changes nothing', async () => {
    await act(() => mountVoice('es', vi.fn()));
    await act(() => mountVoice('en', vi.fn()));
    const nodes = document.querySelectorAll('[data-testid="panel"]');
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toHaveTextContent('es:Habla con el asistente');
  });

  it('removes the node and gives focus back to what opened it', async () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    await act(() => mountVoice('en', vi.fn()));
    document.body.focus();
    await act(async () => panel.onClose());
    expect(document.querySelector('[data-testid="panel"]')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('opens again after a close', async () => {
    await act(() => mountVoice('en', vi.fn()));
    await act(async () => panel.onClose());
    await act(() => mountVoice('en', vi.fn()));
    expect(document.querySelectorAll('[data-testid="panel"]')).toHaveLength(1);
  });

  it('preloads the copy once per locale', async () => {
    await expect(preloadVoice('en')).resolves.toBeUndefined();
  });
});
