import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from '@/components/chat/chat-panel';
import { chatCopy as en } from '@/content/en/chat';
import { chatCopy as es } from '@/content/es/chat';
import type { ChatEvent, ChatFailure } from '@/lib/chat-events';
import { resetChat } from '@/lib/chat-store';

const postChat = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
// 'interactive' answers execute() with Turnstile's checkbox instead of a token;
// the test then drives the widget's callbacks through `handlers`.
const widget = vi.hoisted(() => {
  const state: {
    ready: boolean;
    fail: boolean;
    interactive: boolean;
    handlers: {
      onSuccess: (token: string) => void;
      onTimeout: () => void;
      onBeforeInteractive: () => void;
      onAfterInteractive: () => void;
    } | null;
  } = { ready: true, fail: false, interactive: false, handlers: null };
  return state;
});
const voice = vi.hoisted(() => ({ available: false, openVoice: vi.fn() }));

vi.mock('@/lib/chat-client', () => ({ postChat }));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@/lib/voice-entry', () => ({
  openVoice: voice.openVoice,
  voiceAvailable: () => voice.available,
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ history: { push } }),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
}));
vi.mock('@marsidev/react-turnstile', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    Turnstile: ({
      ref,
      onWidgetLoad,
      onError,
      ...handlers
    }: {
      ref: React.Ref<{ reset: () => void; execute: () => void }>;
      onWidgetLoad?: () => void;
      onError: () => void;
      onSuccess: (token: string) => void;
      onTimeout: () => void;
      onBeforeInteractive: () => void;
      onAfterInteractive: () => void;
    }) => {
      widget.handlers = handlers;
      useImperativeHandle(ref, () => ({
        reset: () => {},
        execute: () =>
          queueMicrotask(() =>
            widget.interactive
              ? handlers.onBeforeInteractive()
              : handlers.onSuccess('tok'),
          ),
      }));
      if (widget.fail) queueMicrotask(onError);
      else if (widget.ready) queueMicrotask(() => onWidgetLoad?.());
      return null;
    },
  };
});

function stubDialog() {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

async function* events(...list: ChatEvent[]) {
  for (const event of list) yield event;
}
const ok = (...list: ChatEvent[]) => ({ ok: true, events: events(...list) });
const failure = (error: ChatFailure['error']): ChatFailure => ({
  ok: false,
  error,
});

function open(
  options: {
    locale?: 'en' | 'es';
    booking?: boolean;
    onClose?: () => void;
  } = {},
) {
  const { locale = 'en', booking = true, onClose = vi.fn() } = options;
  const view = render(
    <ChatPanel
      locale={locale}
      copy={locale === 'en' ? en : es}
      booking={booking}
      onClose={onClose}
    />,
  );
  return { ...view, onClose };
}

async function ask(text: string) {
  const user = userEvent.setup();
  const box = await screen.findByLabelText(en.inputLabel);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: en.send })).toBeDisabled(),
  );
  await user.type(box, text);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: en.send })).toBeEnabled(),
  );
  return { user, box };
}

beforeEach(() => {
  stubDialog();
  postChat.mockReset();
  track.mockReset();
  push.mockReset();
  widget.ready = true;
  widget.fail = false;
  widget.interactive = false;
  voice.available = false;
  voice.openVoice.mockReset();
  resetChat('en');
});

describe('ChatPanel semantics', () => {
  it('is a modal dialog named by its title and described by the AI notice', () => {
    open();
    const dialog = document.querySelector('dialog');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('data-chat-panel');
    const title = within(dialog as HTMLElement).getByRole('heading', {
      name: en.title,
    });
    expect(dialog?.getAttribute('aria-labelledby')).toBe(title.id);
    const notice = document.getElementById(
      dialog?.getAttribute('aria-describedby') ?? '',
    );
    expect(notice).toHaveTextContent(
      "You're chatting with an AI assistant, not a person",
    );
    expect(notice).toHaveTextContent('30 days');
    expect(
      screen.getByRole('link', {
        name: en.privacyLink,
      }),
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(en.badge)).toBeInTheDocument();
  });

  it('keeps the disclosure to one line once the conversation starts, with the full text a tap away', async () => {
    postChat.mockResolvedValue(
      ok({ t: 'text', v: 'Hello.' }, { t: 'done', remaining: 18 }),
    );
    open();
    const line = screen.getByText(en.noticeShort);
    expect(line).toBeVisible();
    const toggle = screen.getByRole('button', { name: en.noticeToggle });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const full = document.getElementById(
      toggle.getAttribute('aria-controls') ?? '',
    );
    expect(full).not.toHaveAttribute('hidden');
    const { user, box } = await ask('hi');
    await user.type(box, '{Enter}');
    await screen.findByText('Hello.');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(full).toHaveAttribute('hidden');
    expect(screen.getByText(en.noticeShort)).toBeVisible();
    await user.click(toggle);
    expect(full).not.toHaveAttribute('hidden');
  });

  it('shows the same notice in Spanish with the Spanish privacy page', () => {
    open({ locale: 'es' });
    expect(
      screen.getByText(/asistente de IA, no con una persona/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: es.privacyLink })).toHaveAttribute(
      'href',
      '/es/privacidad',
    );
  });

  it('keeps the conversation in a polite log with a labelled welcome message', () => {
    open();
    const log = screen.getByRole('log', { name: en.logLabel });
    expect(
      within(log).getByText(/Ask me about our services/),
    ).toBeInTheDocument();
    expect(within(log).getByText(`${en.assistant}:`)).toHaveClass('sr-only');
  });

  it('closes from the labelled button', async () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole('button', { name: en.close }));
    expect(onClose).toHaveBeenCalled();
  });

  it('offers the call suggestion and links only while booking is published', () => {
    const { unmount } = open({ booking: true });
    expect(
      screen.getByRole('button', { name: en.suggestionBooking }),
    ).toBeInTheDocument();
    expect(screen.getByText(/also find you a time/)).toBeInTheDocument();
    unmount();
    open({ booking: false });
    expect(
      screen.queryByRole('button', { name: en.suggestionBooking }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/also find you a time/)).not.toBeInTheDocument();
  });
});

describe('sending', () => {
  it('sends on Enter, not on Shift+Enter, and tracks each message', async () => {
    postChat.mockResolvedValue(
      ok({ t: 'session', id: 'a' }, { t: 'done', remaining: 19 }),
    );
    open();
    const { user, box } = await ask('First line');
    await user.keyboard('{Shift>}{Enter}{/Shift}second line');
    expect(postChat).not.toHaveBeenCalled();
    expect(box).toHaveValue('First line\nsecond line');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
    expect(postChat.mock.calls[0]?.[0]).toMatchObject({
      message: 'First line\nsecond line',
      locale: 'en',
    });
    expect(track).toHaveBeenCalledWith('chat_message');
    expect(box).toHaveValue('');
  });

  it('hides the suggestions after the first message, and a suggestion sends it', async () => {
    postChat.mockResolvedValue(ok({ t: 'done', remaining: 18 }));
    open();
    await ask('x');
    fireEvent.click(screen.getByRole('button', { name: en.suggestions[0] }));
    await waitFor(() => expect(postChat).toHaveBeenCalled());
    expect(
      screen.queryByRole('button', { name: en.suggestions[0] }),
    ).not.toBeInTheDocument();
  });

  it('clears the composer when a suggestion is sent', async () => {
    postChat.mockResolvedValue(ok({ t: 'done', remaining: 18 }));
    open();
    const { box } = await ask('half-typed');
    expect(box).toHaveValue('half-typed');
    fireEvent.click(screen.getByRole('button', { name: en.suggestions[0] }));
    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
    expect(box).toHaveValue('');
  });

  it('holds a message typed before the bot check has loaded, and says so', async () => {
    widget.ready = false;
    open();
    const user = userEvent.setup();
    const box = await screen.findByLabelText(en.inputLabel);
    await user.type(box, 'hello');
    expect(screen.getByRole('button', { name: en.send })).toBeEnabled();
    await user.type(box, '{Enter}');
    expect(postChat).not.toHaveBeenCalled();
    expect(box).toHaveValue('hello');
    expect(screen.getByRole('status')).toHaveTextContent(en.verifying);
    expect(screen.getByRole('button', { name: en.send })).toBeDisabled();
    // Locked while it waits, so no edit is lost.
    expect(box).toHaveAttribute('readonly');
  });

  it('a challenge that never loads stops checking after 20 s and offers the contact link with the draft', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      widget.ready = false;
      open();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const box = await screen.findByLabelText(en.inputLabel);
      await user.type(box, 'hello there');
      await user.type(box, '{Enter}');
      expect(screen.getByRole('status')).toHaveTextContent(en.verifying);
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(en.errorCaptcha);
      expect(
        within(alert).getByRole('link', { name: en.fallback.form }),
      ).toHaveAttribute('href', '/contact?message=hello+there');
      expect(box).not.toHaveAttribute('readonly');
      expect(box).toHaveValue('hello there');
      expect(screen.getByRole('button', { name: en.send })).toBeDisabled();
      expect(postChat).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits past every timer while the visitor ticks the box, then sends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      widget.interactive = true;
      postChat.mockResolvedValue(ok({ t: 'done', remaining: 19 }));
      open();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const box = await screen.findByLabelText(en.inputLabel);
      await waitFor(() =>
        expect(screen.getByRole('button', { name: en.send })).toBeDisabled(),
      );
      await user.type(box, 'hello');
      await user.type(box, '{Enter}');
      expect(
        await screen.findByText('Tick the box to continue.'),
      ).toBeInTheDocument();
      // Past the 30 s limit the token wait keeps while the widget works alone.
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(postChat).not.toHaveBeenCalled();
      act(() => {
        widget.handlers?.onAfterInteractive();
        widget.handlers?.onSuccess('tok');
      });
      await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
      expect(postChat.mock.calls[0]?.[0]).toMatchObject({
        message: 'hello',
        turnstileToken: 'tok',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps waiting through an interactive timeout: the fresh checkbox still sends once', async () => {
    widget.interactive = true;
    postChat.mockResolvedValue(ok({ t: 'done', remaining: 19 }));
    open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    await screen.findByText('Tick the box to continue.');
    act(() => widget.handlers?.onTimeout());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() => {
      widget.handlers?.onBeforeInteractive();
      widget.handlers?.onAfterInteractive();
      widget.handlers?.onSuccess('tok');
    });
    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closing the panel mid-check and opening it again shows no failure', async () => {
    widget.interactive = true;
    const { unmount } = open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    await screen.findByText('Tick the box to continue.');
    fireEvent.click(screen.getByRole('button', { name: en.close }));
    unmount();
    widget.interactive = false;
    open();
    await screen.findByLabelText(en.inputLabel);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(en.errorCaptcha)).not.toBeInTheDocument();
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
    expect(postChat).not.toHaveBeenCalled();
    // The composer is free again: the next message goes out.
    postChat.mockResolvedValue(ok({ t: 'done', remaining: 19 }));
    const next = await ask('again');
    await next.user.keyboard('{Enter}');
    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
  });

  it('a challenge error drops the queued message: no send, the captcha alert carries the draft', async () => {
    widget.ready = false;
    widget.fail = true;
    open();
    const user = userEvent.setup();
    const box = await screen.findByLabelText(en.inputLabel);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.errorCaptcha);
    await user.type(box, 'hello');
    expect(screen.getByRole('button', { name: en.send })).toBeDisabled();
    await user.type(box, '{Enter}');
    expect(postChat).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole('alert')).getByRole('link', {
        name: en.fallback.form,
      }),
    ).toHaveAttribute('href', '/contact?message=hello');
  });

  it('draws the times check_availability returned as chips, without the plain list', async () => {
    const zone = 'Europe/Madrid';
    const monday9 = Date.UTC(2027, 0, 11, 8);
    const monday930 = monday9 + 1_800_000;
    postChat.mockResolvedValue(
      ok(
        { t: 'tool', name: 'check_availability' },
        { t: 'slots', zone, starts: [monday9, monday930] },
        {
          t: 'text',
          v: 'These are the free times:\nMonday 11 January:\n- 9:00 am\n- 9:30 am\nWhich one suits you?',
        },
        { t: 'done', remaining: 18 },
      ),
    );
    open();
    const { user, box } = await ask('what times are free?');
    await user.type(box, '{Enter}');
    const chips = await screen.findAllByRole('link', {
      name: /Monday 11 January, 9:(00|30) am/,
    });
    expect(chips.map((chip) => chip.getAttribute('href'))).toEqual([
      `/book?slot=${monday9}`,
      `/book?slot=${monday930}`,
    ]);
    expect(chips.map((chip) => chip.textContent)).toEqual([
      '9:00 am',
      '9:30 am',
    ]);
    const reply = document.querySelector('[data-ai-generated="true"]');
    // A model that lists them anyway: the list and its lead-in go.
    expect(reply).not.toHaveTextContent('These are the free times');
    expect(reply).toHaveTextContent('Which one suits you?');
    expect(reply).not.toHaveTextContent('9:00');
    expect(screen.getByText(/Times in Madrid/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.slots.seeAll })).toHaveAttribute(
      'href',
      '/book',
    );
    const second = chips[1];
    if (!second) throw new Error('no second chip');
    await user.click(second);
    expect(
      await screen.findByRole('heading', { name: en.booking.title }),
    ).toBeInTheDocument();
    // The card shows the time in the browser's zone, which sent the request.
    expect(
      screen.getByText(/^Monday 11 January, \d{1,2}:30 [ap]m$/),
    ).toBeInTheDocument();
  });

  it('says when the browser is offline and holds the message', async () => {
    open();
    const box = await screen.findByLabelText(en.inputLabel);
    const user = userEvent.setup();
    await user.type(box, 'hello');
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => {
      dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(en.offline);
    expect(screen.getByRole('button', { name: en.send })).toBeDisabled();
    onLine.mockReturnValue(true);
    act(() => {
      dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('button', { name: en.send })).toBeEnabled();
    onLine.mockRestore();
  });

  it('hides the reply being written from screen readers and announces the finished message once', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    postChat.mockResolvedValue({
      ok: true,
      events: (async function* () {
        yield { t: 'session', id: 'a' } satisfies ChatEvent;
        yield { t: 'text', v: 'Partial answer. ' } satisfies ChatEvent;
        await gate;
        yield { t: 'done', remaining: 19 } satisfies ChatEvent;
      })(),
    });
    open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    const streaming = await waitFor(() => {
      const node = document.querySelector('[data-streaming]');
      if (!node) throw new Error('not streaming');
      return node;
    });
    expect(streaming).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(en.writing);
    expect(document.querySelector('dialog')).toHaveAttribute(
      'data-chat-state',
      'writing',
    );
    await act(async () => {
      release();
    });
    await waitFor(() =>
      expect(document.querySelector('[data-streaming]')).toBeNull(),
    );
    const finished = document.querySelector('[data-ai-generated="true"]');
    expect(finished).toHaveTextContent('Partial answer.');
    expect(finished).not.toHaveAttribute('aria-hidden');
    expect(document.querySelectorAll('[data-ai-generated]')).toHaveLength(1);
  });

  it.each([
    ['get_pricing', en.tools.get_pricing],
    ['check_availability', en.tools.check_availability],
  ])('names the %s step in the status line', async (tool, label) => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    postChat.mockResolvedValue({
      ok: true,
      events: (async function* () {
        yield { t: 'tool', name: tool } satisfies ChatEvent;
        await gate;
        yield { t: 'done', remaining: 19 } satisfies ChatEvent;
      })(),
    });
    open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(label),
    );
    await act(async () => {
      release();
    });
  });
});

describe('when the assistant cannot answer', () => {
  it.each(['budget', 'unavailable', 'session-full'] as const)(
    'shows the fallback with the three ways to reach us for %s',
    async (error) => {
      postChat.mockResolvedValue(failure(error));
      open();
      const { user } = await ask('hello');
      await user.keyboard('{Enter}');
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(en.fallback.title);
      expect(
        within(alert).getByRole('link', { name: en.fallback.book }),
      ).toHaveAttribute('href', '/book');
      // The contact link carries what the visitor asked, so it is not lost.
      expect(
        within(alert).getByRole('link', { name: en.fallback.form }),
      ).toHaveAttribute('href', '/contact?message=hello');
      expect(
        within(alert).getByRole('link', { name: 'hello@zenetlabs.com' }),
      ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
      if (error === 'session-full')
        expect(alert).toHaveTextContent(en.fallback.full);
    },
  );

  it('leaves out the booking link while booking is dark', async () => {
    postChat.mockResolvedValue(failure('budget'));
    open({ booking: false });
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    const alert = await screen.findByRole('alert');
    expect(
      within(alert).queryByRole('link', { name: en.fallback.book }),
    ).not.toBeInTheDocument();
  });

  it('says the visitor is sending too fast on a rate limit, with no fallback block', async () => {
    postChat.mockResolvedValue(failure('rate'));
    open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(en.errorRate);
    expect(screen.queryByText(en.fallback.title)).not.toBeInTheDocument();
  });

  it('keeps a cut reply and offers the direct contacts', async () => {
    postChat.mockResolvedValue(
      ok(
        { t: 'text', v: 'Half. ' },
        { t: 'error', code: 'unavailable' },
        { t: 'done', remaining: 5 },
      ),
    );
    open();
    const { user } = await ask('hello');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(en.errorReply);
    expect(screen.getByText('Half.')).toBeInTheDocument();
  });
});

describe('page chips', () => {
  it('is a link that closes the dialog and navigates in the app on a plain click, keeping the conversation', async () => {
    postChat.mockResolvedValue(
      ok(
        { t: 'navigate', page: 'pricing', href: '/pricing' },
        { t: 'done', remaining: 19 },
      ),
    );
    const { onClose } = open();
    const { user } = await ask('pricing page');
    await user.keyboard('{Enter}');
    const chip = await screen.findByRole('link', { name: 'Open: Pricing' });
    expect(chip).toHaveAttribute('href', '/pricing');
    fireEvent.click(chip);
    expect(push).toHaveBeenCalledWith('/pricing');
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves a modified click to the browser', async () => {
    postChat.mockResolvedValue(
      ok(
        { t: 'navigate', page: 'home', section: 'faq', href: '/#faq' },
        { t: 'done', remaining: 19 },
      ),
    );
    open();
    const { user } = await ask('faq');
    await user.keyboard('{Enter}');
    const chip = await screen.findByRole('link', { name: 'Open: FAQ' });
    fireEvent.click(chip, { ctrlKey: true });
    expect(push).not.toHaveBeenCalled();
  });
});

describe('Talk instead', () => {
  it('is not offered when the locale has no voice agent', () => {
    open();
    expect(
      screen.queryByRole('button', { name: en.talk }),
    ).not.toBeInTheDocument();
  });

  it('closes the chat and opens the voice panel in the chat locale', async () => {
    voice.available = true;
    const { onClose } = open({ locale: 'es' });
    await userEvent.click(screen.getByRole('button', { name: es.talk }));
    expect(onClose).toHaveBeenCalled();
    expect(voice.openVoice).toHaveBeenCalledWith('es', expect.any(Function));
  });
});

describe('opened from the home desk', () => {
  type Played = { frames: unknown; options: unknown };

  function stubMotion(reduce: boolean): Played[] {
    const played: Played[] = [];
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('reduce') ? reduce : true,
      })),
    );
    vi.spyOn(HTMLElement.prototype, 'animate').mockImplementation(
      (frames, options) => {
        played.push({ frames, options });
        return new Animation();
      },
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 900, y: 200, width: 416, height: 640 }),
    );
    return played;
  }

  function desk(): Element {
    const element = document.createElement('section');
    document.body.appendChild(element);
    Object.defineProperty(element, 'getBoundingClientRect', {
      value: () =>
        DOMRect.fromRect({ x: 600, y: 160, width: 760, height: 560 }),
    });
    return element;
  }

  function openFromDesk(initialMessage: string | null) {
    return render(
      <ChatPanel
        locale="en"
        copy={en}
        booking
        initialMessage={initialMessage}
        from={desk()}
        onClose={vi.fn()}
      />,
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the desk message once the challenge is ready, like a typed one', async () => {
    stubMotion(true);
    postChat.mockResolvedValue(
      ok({ t: 'session', id: 'a' }, { t: 'done', remaining: 19 }),
    );
    openFromDesk('How much does an AI agent cost?');
    await waitFor(() => expect(postChat).toHaveBeenCalledTimes(1));
    expect(postChat.mock.calls[0]?.[0]).toMatchObject({
      message: 'How much does an AI agent cost?',
      turnstileToken: 'tok',
    });
    expect(track).toHaveBeenCalledWith('chat_message');
  });

  it('keeps the desk message in the composer until the challenge can carry it', async () => {
    stubMotion(true);
    widget.ready = false;
    openFromDesk('Can you read our PDFs?');
    expect(await screen.findByLabelText(en.inputLabel)).toHaveValue(
      'Can you read our PDFs?',
    );
    expect(postChat).not.toHaveBeenCalled();
  });

  it('keeps the text and offers the contact form with it when the challenge fails', async () => {
    stubMotion(true);
    widget.fail = true;
    openFromDesk('Can you read our PDFs?');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(en.errorCaptcha);
    expect(
      within(alert).getByRole('link', { name: en.fallback.form }),
    ).toHaveAttribute(
      'href',
      `/contact?${new URLSearchParams({ message: 'Can you read our PDFs?' })}`,
    );
    expect(screen.getByLabelText(en.inputLabel)).toHaveValue(
      'Can you read our PDFs?',
    );
  });

  it('opens empty when the desk had no message', async () => {
    stubMotion(true);
    openFromDesk(null);
    await screen.findByLabelText(en.inputLabel);
    await act(async () => {
      await Promise.resolve();
    });
    expect(postChat).not.toHaveBeenCalled();
  });

  it('grows from the desk box with a transform', () => {
    const played = stubMotion(false);
    openFromDesk(null);
    const { frames, options } = played[0] ?? {};
    expect(frames).toEqual([
      expect.objectContaining({
        transform: 'translate(-300px, -40px) scale(1.8269230769230769, 0.875)',
      }),
      expect.objectContaining({ transform: 'none' }),
    ]);
    expect(options).toMatchObject({
      duration: 260,
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    });
  });

  it('swaps instantly under reduced motion', () => {
    const played = stubMotion(true);
    openFromDesk(null);
    expect(played).toEqual([]);
  });
});
