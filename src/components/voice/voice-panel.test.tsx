import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
// 'interactive' answers execute() with Turnstile's checkbox instead of a token;
// the test then drives the widget's callbacks through `handlers`.
const widget = vi.hoisted(() => {
  const order: string[] = [];
  const state: {
    ready: boolean;
    order: string[];
    interactive: boolean;
    handlers: {
      onSuccess: (token: string) => void;
      onError: () => void;
      onUnsupported: () => void;
      onTimeout: () => void;
      onBeforeInteractive: () => void;
      onAfterInteractive: () => void;
    } | null;
  } = { ready: true, order, interactive: false, handlers: null };
  return state;
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
      ...handlers
    }: {
      ref: React.Ref<{ reset: () => void; execute: () => void }>;
      onWidgetLoad: () => void;
      onSuccess: (token: string) => void;
      onError: () => void;
      onUnsupported: () => void;
      onTimeout: () => void;
      onBeforeInteractive: () => void;
      onAfterInteractive: () => void;
    }) => {
      widget.handlers = handlers;
      useImperativeHandle(ref, () => ({
        reset: () => widget.order.push('reset'),
        execute: () => {
          widget.order.push('execute');
          queueMicrotask(() =>
            widget.interactive
              ? handlers.onBeforeInteractive()
              : handlers.onSuccess('tok'),
          );
        },
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
  widget.interactive = false;
  device.state.supported = true;
  device.requestMic.mockReset().mockImplementation(async () => {
    widget.order.push('mic');
    return device.state.mic;
  });
  device.state.mic = 'granted';
  delete window.__voiceFake;
  await act(() => resetCall());
});

// A phone; under reduced motion the release settles at once.
function stubPhone({ reduced = true }: { reduced?: boolean } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('width <') || (reduced && query.includes('reduce')),
  }));
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(
    () => undefined,
  );
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: 390, height: 600 }),
  );
}

const POINTER = { isPrimary: true, button: 0 };

function sheet() {
  const dialog = screen.getByRole('dialog');
  const header = dialog.querySelector('header');
  if (!header) throw new Error('no header');
  return { dialog, header };
}

function press(target: Element, pointerId: number, clientY = 100) {
  fireEvent.pointerDown(target, { ...POINTER, pointerId, clientY });
}

function moveTo(pointerId: number, clientY: number) {
  fireEvent.pointerMove(sheet().dialog, { ...POINTER, pointerId, clientY });
}

function dragHeader(distance: number) {
  const { dialog, header } = sheet();
  press(header, 1);
  moveTo(1, 100 + distance);
  fireEvent.pointerUp(dialog, {
    ...POINTER,
    pointerId: 1,
    clientY: 100 + distance,
  });
  return dialog;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    expect(widget.order).toEqual(['mic', 'reset', 'execute']);
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

  it('asks the visitor to tick the box while Turnstile is interactive, then calls once it is solved', async () => {
    widget.interactive = true;
    mount();
    await start();
    expect(
      await screen.findByText('Tick the box to continue.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(en.errorCaptcha)).not.toBeInTheDocument();
    expect(mint).not.toHaveBeenCalled();
    act(() => {
      widget.handlers?.onAfterInteractive();
      widget.handlers?.onSuccess('tok');
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.listening),
    );
    expect(mint).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: 'tok' }),
      undefined,
    );
    expect(
      screen.queryByText('Tick the box to continue.'),
    ).not.toBeInTheDocument();
  });

  it('keeps waiting through an interactive timeout: the fresh checkbox still starts the call', async () => {
    widget.interactive = true;
    mount();
    await start();
    await screen.findByText('Tick the box to continue.');
    act(() => widget.handlers?.onTimeout());
    expect(screen.queryByText(en.errorCaptcha)).not.toBeInTheDocument();
    expect(screen.getByText('Tick the box to continue.')).toBeInTheDocument();
    act(() => {
      widget.handlers?.onBeforeInteractive();
      widget.handlers?.onAfterInteractive();
      widget.handlers?.onSuccess('tok');
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.listening),
    );
    expect(mint).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(en.errorCaptcha)).not.toBeInTheDocument();
  });

  it.each(['onError', 'onUnsupported'] as const)(
    '%s shows the captcha error, and "Try again" runs a fresh check',
    async (name) => {
      widget.interactive = true;
      mount();
      await start();
      await screen.findByText('Tick the box to continue.');
      act(() => widget.handlers?.[name]());
      expect(await screen.findByText(en.errorCaptcha)).toBeInTheDocument();
      expect(screen.queryByText('Tick the box to continue.')).toBeNull();
      expect(mint).not.toHaveBeenCalled();
      widget.interactive = false;
      widget.order.length = 0;
      await userEvent.click(screen.getByRole('button', { name: en.again }));
      await start();
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(en.listening),
      );
      expect(widget.order).toEqual(['mic', 'reset', 'execute']);
      expect(mint).toHaveBeenCalledTimes(1);
    },
  );

  it('ending the call while the checkbox shows takes the hint along', async () => {
    widget.interactive = true;
    mount();
    await start();
    await screen.findByText('Tick the box to continue.');
    await userEvent.click(screen.getByRole('button', { name: en.end }));
    expect(screen.getByRole('status')).toHaveTextContent(en.ended);
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
    expect(screen.queryByText(en.errorCaptcha)).toBeNull();
    expect(widget.order.at(-1)).toBe('reset');
    expect(mint).not.toHaveBeenCalled();
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

  it('shows the pending line and tracks the request from the full tool result', async () => {
    mount();
    await start();
    await screen.findByRole('button', { name: en.mute });
    act(() =>
      window.__voiceFake?.emitToolResult(
        'book_meeting',
        JSON.stringify({
          ok: true,
          result: { status: 'pending', label: 'Tuesday 3 November, 5:00 pm' },
        }),
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Held for Tuesday 3 November, 5:00 pm. Check your email to confirm.',
    );
    expect(track).toHaveBeenCalledWith('book_request');
  });

  it('explains a blocked microphone with the fallback links and mints nothing', async () => {
    device.state.mic = 'denied';
    mount();
    await start();
    expect(await screen.findByRole('alert')).toHaveTextContent(en.micDenied);
    expect(mint).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: en.fallbackForm })).toHaveAttribute(
      'href',
      '/contact',
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

  it('closes from the intro when the sheet is dragged down', async () => {
    stubPhone();
    const onClose = mount();
    dragHeader(360);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('holds the sheet during a live call: a drag never ends it', async () => {
    stubPhone();
    const onClose = mount();
    await start();
    await screen.findByRole('button', { name: en.mute });
    const dialog = dragHeader(360);
    expect(dialog.style.transform).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent(en.listening);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('holds the sheet while a call connects', async () => {
    stubPhone();
    mint.mockReturnValue(new Promise(() => {}));
    const onClose = mount();
    await start();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(en.connecting),
    );
    dragHeader(360);
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(en.connecting);
  });

  it('keeps a call that starts while the sheet slides away', async () => {
    stubPhone({ reduced: false });
    const onClose = mount();
    const button = screen.getByRole('button', { name: en.start });
    await waitFor(() => expect(button).toBeEnabled());
    dragHeader(360);
    await userEvent.click(button);
    await screen.findByRole('button', { name: en.mute });
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(en.listening);
  });

  for (const end of ['pointerCancel', 'lostPointerCapture'] as const) {
    it(`puts the sheet back on ${end}, without closing`, () => {
      stubPhone();
      const onClose = mount();
      const { dialog, header } = sheet();
      press(header, 1);
      moveTo(1, 460);
      expect(dialog.style.transform).not.toBe('');
      fireEvent[end](dialog, { ...POINTER, pointerId: 1, clientY: 460 });
      expect(dialog.style.transform).toBe('');
      moveTo(1, 600);
      expect(dialog.style.transform).toBe('');
      expect(onClose).not.toHaveBeenCalled();
    });
  }

  it('recovers from a drag whose end never came', async () => {
    stubPhone();
    const onClose = mount();
    const { dialog, header } = sheet();
    press(header, 1);
    moveTo(1, 460);
    press(screen.getByRole('status'), 2);
    expect(dialog.style.transform).toBe('');
    dragHeader(360);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('never starts a drag on a header control', () => {
    stubPhone();
    const onClose = mount();
    const { dialog } = sheet();
    press(screen.getByRole('button', { name: en.close }), 1);
    moveTo(1, 460);
    expect(dialog.style.transform).toBe('');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes from the intro with Not now', async () => {
    const onClose = mount();
    await userEvent.click(screen.getByRole('button', { name: en.cancel }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });
});
