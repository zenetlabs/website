import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from '@/components/chat/chat-panel';
import { chatCopy as en } from '@/content/en/chat';
import { chatCopy as es } from '@/content/es/chat';
import type { ChatEvent, ChatFailure } from '@/lib/chat-events';
import { resetChat } from '@/lib/chat-store';

const postChat = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const widget = vi.hoisted(() => ({ ready: true }));
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
        execute: () => {},
        getResponsePromise: async () => 'tok',
      }));
      if (widget.ready) queueMicrotask(onWidgetLoad);
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
      within(notice as HTMLElement).getByRole('link', { name: en.privacyLink }),
    ).toHaveAttribute('href', '/privacy');
    expect(screen.getByText(en.badge)).toBeInTheDocument();
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

  it('waits for the bot check before the first send', async () => {
    widget.ready = false;
    open();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(en.inputLabel), 'hello');
    expect(screen.getByRole('button', { name: en.send })).toBeDisabled();
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
      expect(
        within(alert).getByRole('link', { name: en.fallback.form }),
      ).toHaveAttribute('href', '/#contact');
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
