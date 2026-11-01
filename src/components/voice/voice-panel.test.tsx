import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoicePanel } from '@/components/voice/voice-panel';
import { voiceCopy as en } from '@/content/en/voice';
import { voiceCopy as es } from '@/content/es/voice';
import { resetCall } from '@/lib/voice-store';

const track = vi.hoisted(() => vi.fn());
const mint = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
type Mic = 'granted' | 'denied' | 'error';
const device = vi.hoisted(() => {
  const state: { supported: boolean; mic: Mic } = {
    supported: true,
    mic: 'granted',
  };
  return { state, requestMic: vi.fn() };
});
const widget = vi.hoisted(() => {
  const order: string[] = [];
  return { ready: true, order };
});

vi.mock('@/lib/track', () => ({ track }));
vi.mock('@/lib/voice-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/voice-client')>()),
  mintVoiceSession: mint,
}));
vi.mock('@/lib/voice-device', () => ({
  voiceSupported: () => device.state.supported,
  requestMic: device.requestMic,
}));
vi.mock('@/lib/voice-sdk', async () => {
  const { fakeVoiceSdk } = await import('@/lib/voice-fake-sdk');
  return { loadVoiceSdk: async () => fakeVoiceSdk };
});
vi.mock('@marsidev/react-turnstile', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    Turnstile: ({
      ref,
      onWidgetLoad,
    }: {
      ref: React.Ref<{
        reset: () => void;
        execute: () => void;
        getResponsePromise: () => Promise<string>;
      }>;
      onWidgetLoad: () => void;
    }) => {
      useImperativeHandle(ref, () => ({
        reset: () => {},
        execute: () => widget.order.push('execute'),
        getResponsePromise: async () => 'tok',
      }));
      if (widget.ready) queueMicrotask(onWidgetLoad);
      return null;
    },
  };
});

function stubDialog() {
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute('open', '');
  };
}

const MINTED = {
  ok: true,
  token: 'fake-voice-token-1',
  sessionId: 's1',
  maxSeconds: 300,
};

function mount(locale: 'en' | 'es' = 'en', onClose = vi.fn()) {
  render(
    <VoicePanel
      locale={locale}
      copy={locale === 'en' ? en : es}
      push={push}
      onClose={onClose}
    />,
  );
  return onClose;
}

beforeEach(async () => {
  stubDialog();
  track.mockReset();
  push.mockReset();
  mint.mockReset().mockResolvedValue(MINTED);
  widget.ready = true;
  widget.order = [];
  device.state.supported = true;
  device.requestMic.mockReset().mockImplementation(async () => {
    widget.order.push('mic');
    return device.state.mic;
  });
  device.state.mic = 'granted';
  delete window.__voiceFake;
  await act(() => resetCall());
});

async function start() {
  const button = screen.getByRole('button', { name: en.start });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}

describe('VoicePanel', () => {
  it('opens non-modal, labelled, with the AI notice, the privacy link and no microphone request', async () => {
    mount();
    const dialog = screen.getByRole('dialog', { name: en.title });
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('data-voice-panel');
    expect(dialog).toHaveAccessibleDescription(
      expect.stringContaining('not a person'),
    );
    expect(screen.getByRole('link', { name: en.privacyLink })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByText(en.micNote)).toBeInTheDocument();
    expect(screen.getByText(en.badge)).toBeInTheDocument();
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: en.title }),
    );
    expect(device.requestMic).not.toHaveBeenCalled();
    expect(mint).not.toHaveBeenCalled();
  });

  it('speaks Spanish with the Spanish privacy page', () => {
    mount('es');
    expect(screen.getByRole('dialog', { name: es.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.privacyLink })).toHaveAttribute(
      'href',
      '/es/privacidad',
    );
  });

  it('keeps Start disabled until the Turnstile widget has loaded', () => {
    widget.ready = false;
    mount();
    expect(screen.getByRole('button', { name: en.start })).toBeDisabled();
  });

  it('asks for the microphone, then Turnstile, then mints, and goes live', async () => {
    mount();
    await start();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.listening),
    );
    expect(widget.order).toEqual(['mic', 'execute']);
    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', turnstileToken: 'tok' }),
      undefined,
    );
    expect(track).toHaveBeenCalledWith('voice_call_start');
    expect(screen.getByRole('button', { name: en.mute })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(window.__voiceFake?.options.sessionId).toBe('s1');
    const transcript = screen.getByRole('list', { name: en.transcript });
    expect(transcript).toHaveTextContent('scripted voice assistant');
    expect(
      transcript.querySelector('[data-ai-generated="true"]'),
    ).not.toBeNull();
  });

  it('toggles mute with aria-pressed and ends the call', async () => {
    mount();
    await start();
    await userEvent.click(await screen.findByRole('button', { name: en.mute }));
    expect(screen.getByRole('button', { name: en.unmute })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: en.end }));
    expect(screen.getByRole('status')).toHaveTextContent(en.ended);
    expect(screen.getByRole('button', { name: en.again })).toBeInTheDocument();
  });

  it('opens a page the agent asks for and keeps the call going', async () => {
    mount();
    await start();
    await screen.findByRole('button', { name: en.mute });
    await act(async () => {
      await window.__voiceFake?.callClientTool('navigate', { page: 'pricing' });
    });
    expect(push).toHaveBeenCalledWith('/pricing');
    expect(screen.getByRole('status')).toHaveTextContent(
      `Opened: ${en.pages.pricing}`,
    );
    expect(screen.getByRole('button', { name: en.mute })).toBeInTheDocument();
  });

  it('shows the booked line and tracks the booking from the full tool result', async () => {
    mount();
    await start();
    await screen.findByRole('button', { name: en.mute });
    act(() =>
      window.__voiceFake?.emitToolResult(
        'book_meeting',
        JSON.stringify({
          ok: true,
          result: { status: 'booked', label: 'Tuesday 3 November, 5:00 pm' },
        }),
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Booked for Tuesday 3 November, 5:00 pm',
    );
    expect(track).toHaveBeenCalledWith('book_meeting');
    expect(track).toHaveBeenCalledWith('generate_lead', { method: 'voice' });
  });

  it('explains a blocked microphone with the fallback links and mints nothing', async () => {
    device.state.mic = 'denied';
    mount();
    await start();
    expect(await screen.findByRole('alert')).toHaveTextContent(en.micDenied);
    expect(mint).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: en.fallbackForm })).toHaveAttribute(
      'href',
      '/#contact',
    );
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
    await userEvent.click(screen.getByRole('button', { name: en.again }));
    expect(screen.getByRole('button', { name: en.start })).toBeInTheDocument();
  });

  it.each([
    ['budget', en.errorBudget],
    ['rate', en.errorRate],
    ['captcha', en.errorCaptcha],
    ['unavailable', en.errorCall],
  ] as const)(
    'shows the %s answer of the server with the fallback',
    async (error, text) => {
      mint.mockResolvedValue({ ok: false, error });
      mount();
      await start();
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(screen.getByText(en.fallbackText)).toBeInTheDocument();
      expect(window.__voiceFake).toBeUndefined();
    },
  );

  it('says so when the browser cannot make calls, without asking for the microphone', async () => {
    device.state.supported = false;
    mount();
    await start();
    expect(await screen.findByRole('alert')).toHaveTextContent(en.unsupported);
    expect(device.requestMic).not.toHaveBeenCalled();
  });

  it('ends the call and closes on Escape, on the close button and on Not now', async () => {
    const onClose = mount();
    await start();
    await screen.findByRole('button', { name: en.mute });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.__voiceFake).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: en.close }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it('closes from the intro with Not now', async () => {
    const onClose = mount();
    await userEvent.click(screen.getByRole('button', { name: en.cancel }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
