import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentDesk } from '@/components/agent-desk';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { CONTENT } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';

function exactly(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`no ${selector}`);
  return found;
}

const flags = vi.hoisted(() => ({ booking: false, voice: false }));
const requestChat = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock('@/lib/site', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site')>();
  return {
    ...actual,
    get SITE() {
      return { ...actual.SITE, booking: { published: flags.booking } };
    },
  };
});
vi.mock('@/lib/voice-entry', () => ({
  voiceAvailable: () => flags.voice,
  prefetchVoice: vi.fn(),
  openVoice: vi.fn(),
}));
vi.mock('@/lib/chat-open', () => ({ requestChat }));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@/lib/next-slots', () => ({
  useNextSlots: () => ({ status: 'waiting' }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useHydrated: () => true,
  useRouter: () => ({ history: { push: vi.fn() } }),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: 'en' }),
}));

beforeEach(() => {
  flags.booking = false;
  flags.voice = false;
  requestChat.mockReset();
  track.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([
  ['en', enHome],
  ['es', esHome],
] as const)('AgentDesk (%s)', (locale, home) => {
  const { desk } = home;
  const contact = pagePath(locale, 'contact');

  function view() {
    return render(
      <AgentDesk
        copy={desk}
        locale={locale}
        founder={CONTENT[locale].founder}
      />,
    );
  }

  it('names the AI assistant and its badge while the assistant is live', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view();
    expect(
      screen.getByRole('heading', { level: 2, name: desk.intro.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(desk.intro.badge)).toBeInTheDocument();
    expect(screen.getByText(exactly(desk.intro.welcome))).toBeInTheDocument();
    expect(screen.getByLabelText(desk.label)).toHaveAttribute(
      'placeholder',
      desk.intro.placeholder,
    );
  });

  it('says a person answers by email, with no AI badge, while the assistant is dark', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view();
    expect(
      screen.getByRole('heading', { level: 2, name: desk.human.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText(desk.intro.badge)).toBeNull();
    expect(screen.queryByText(desk.intro.title)).toBeNull();
    expect(screen.getByText(exactly(desk.human.welcome))).toBeInTheDocument();
    expect(screen.getByLabelText(desk.human.label)).toHaveAttribute(
      'placeholder',
      desk.human.placeholder,
    );
    for (const suggestion of desk.intro.suggestions) {
      expect(screen.getByRole('link', { name: suggestion })).toHaveAttribute(
        'href',
        `${contact}?${new URLSearchParams({ message: suggestion })}`,
      );
    }
  });

  it('works without JavaScript: chips link and the composer posts to the contact page', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view();
    for (const suggestion of desk.intro.suggestions) {
      expect(screen.getByRole('link', { name: suggestion })).toHaveAttribute(
        'href',
        `${contact}?${new URLSearchParams({ message: suggestion })}`,
      );
    }
    const box = screen.getByLabelText(desk.label);
    const form = box.closest('form');
    if (!form) throw new Error('no form');
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', contact);
    expect(box).toHaveAttribute('name', 'message');
    expect(box).toHaveAttribute('maxlength', '1000');
    expect(
      within(form).getByRole('button', { name: desk.intro.send }),
    ).toHaveAttribute('type', 'submit');
  });

  it('keeps the chips and composer as plain navigation while the assistant is dark', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view();
    const chip = screen.getByRole('link', { name: desk.intro.suggestions[0] });
    expect(chip).not.toHaveAttribute('aria-haspopup');
    expect(fireEvent.click(chip)).toBe(true);
    expect(requestChat).not.toHaveBeenCalled();
  });

  it('opens the chat with the chip as the first message once the assistant is live', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    const { container } = view();
    const chip = screen.getByRole('link', { name: desk.intro.suggestions[1] });
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    expect(fireEvent.click(chip, { detail: 1 })).toBe(false);
    expect(requestChat).toHaveBeenCalledWith(
      desk.intro.suggestions[1],
      container.querySelector('[data-desk]'),
    );
    fireEvent.click(chip, { detail: 0 });
    expect(requestChat).toHaveBeenLastCalledWith(
      desk.intro.suggestions[1],
      null,
    );
    expect(track).toHaveBeenCalledWith('chat_open', { entry: 'desk' });
  });

  it('sends what the visitor typed into the chat and clears the box', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view();
    const box = screen.getByLabelText(desk.label);
    fireEvent.change(box, { target: { value: 'Can you read PDFs?' } });
    fireEvent.submit(box);
    expect(requestChat).toHaveBeenCalledWith('Can you read PDFs?', null);
    expect(box).toHaveValue('');
  });

  it('has no call door while voice is dark, and a link to the contact page when it is live', () => {
    const { unmount } = view();
    expect(document.querySelector('[data-desk-call]')).toBeNull();
    unmount();
    flags.voice = true;
    view();
    const door = screen.getByRole('link', { name: desk.call?.button });
    expect(door).toHaveAttribute('href', contact);
    expect(door).toHaveAttribute('data-voice-button');
    expect(door).toHaveAttribute('aria-haspopup', 'dialog');
    expect(element('[data-desk-call]')).toHaveAttribute('data-needs-js');
  });

  it('offers a message instead of slots while booking is off', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view();
    const rail = element('[data-slot-rail]');
    expect(rail).toHaveAttribute('data-slot-rail', 'off');
    expect(rail).toHaveTextContent(desk.slots.unavailable);
    expect(
      within(rail).getByRole('link', { name: desk.slots.message }),
    ).toHaveAttribute('href', contact);
    expect(screen.getByText(exactly(desk.intro.welcome))).toBeInTheDocument();
  });

  it('shows one link to all times while the slots load, and offers the call in the greeting', () => {
    flags.booking = true;
    vi.stubGlobal('__ASSISTANT__', true);
    view();
    const rail = element('[data-slot-rail]');
    expect(rail).toHaveAttribute('data-slot-rail', 'live');
    expect(
      within(rail).getByRole('link', { name: desk.slots.seeAvailable }),
    ).toHaveAttribute('href', pagePath(locale, 'book'));
    expect(
      screen.getByText(desk.intro.welcome + desk.intro.welcomeBooking),
    ).toBeInTheDocument();
  });

  it('keeps the human greeting with booking on while the assistant is dark', () => {
    flags.booking = true;
    vi.stubGlobal('__ASSISTANT__', false);
    view();
    expect(screen.getByText(exactly(desk.human.welcome))).toBeInTheDocument();
    expect(element('[data-slot-rail]')).toHaveAttribute(
      'data-slot-rail',
      'live',
    );
  });

  it('hands over to the founder, in the amber of a person, linked to the about page', () => {
    view();
    const handoff = screen.getByRole('link', { name: /Albert/ });
    expect(handoff).toHaveAttribute('href', pagePath(locale, 'about'));
    expect(handoff).toHaveTextContent(desk.handoff);
    expect(handoff.querySelector('.monogram')).toHaveTextContent('AS');
  });
});
