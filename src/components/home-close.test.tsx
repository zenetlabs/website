import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeClose } from '@/components/home-close';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import type { SiteFlags } from '@/lib/page-registry';

const voice = vi.hoisted(() => ({ available: false }));
const requestChat = vi.hoisted(() => vi.fn());
const track = vi.hoisted(() => vi.fn());

vi.mock('@/lib/voice-entry', () => ({
  voiceAvailable: () => voice.available,
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
}));

const BOOKING: SiteFlags = {
  calculator: { published: false },
  booking: { published: true },
};
const NO_BOOKING: SiteFlags = {
  calculator: { published: false },
  booking: { published: false },
};

beforeEach(() => {
  voice.available = false;
  requestChat.mockReset();
  track.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe.each([
  ['en', enHome, '/contact', '/book'],
  ['es', esHome, '/es/contacto', '/es/reservar'],
] as const)('HomeClose (%s)', (locale, home, contact, book) => {
  function view(site: SiteFlags) {
    return render(
      <HomeClose
        copy={home.contact}
        doors={home.doors}
        slots={home.desk.slots}
        locale={locale}
        site={site}
      />,
    );
  }

  function doors() {
    const list = document.querySelector<HTMLElement>('[data-doors]');
    if (!list) throw new Error('no doors');
    return list;
  }

  it('keeps only the write door, in two columns, with chat, voice and booking all off', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(NO_BOOKING);
    const list = doors();
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(list).getByRole('link', {
        name: (accessible: string) =>
          accessible.startsWith(home.doors.write.title),
      }),
    ).toHaveAttribute('href', contact);
    expect(list).toHaveClass('md:grid-cols-2');
    expect(document.querySelector('.slot-card')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
  });

  it('adds the times card beside one column of doors while booking is on', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(BOOKING);
    expect(doors()).not.toHaveClass('md:grid-cols-2');
    const card = document.querySelector<HTMLElement>('.slot-card');
    if (!card) throw new Error('no card');
    expect(
      within(card).getByRole('link', { name: home.desk.slots.seeAvailable }),
    ).toHaveAttribute('href', book);
  });

  it('opens the chat from the ask door once the assistant is live, tracked as the close', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view(NO_BOOKING);
    const ask = within(doors()).getByRole('link', {
      name: (accessible: string) => accessible.startsWith(home.doors.ask.title),
    });
    expect(ask).toHaveAttribute('aria-haspopup', 'dialog');
    expect(ask.closest('li')).toHaveAttribute('data-needs-js');
    ask.click();
    expect(requestChat).toHaveBeenCalledWith(null, null);
    expect(track).toHaveBeenCalledWith('chat_open', { entry: 'close' });
  });

  it('adds the call door only while voice is live', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    voice.available = true;
    view(NO_BOOKING);
    const call = within(doors()).getByRole('link', {
      name: (accessible: string) =>
        accessible.startsWith(home.doors.call?.title ?? 'none'),
    });
    expect(call).toHaveAttribute('href', contact);
    expect(call).toHaveAttribute('data-voice-button');
    expect(within(doors()).getAllByRole('listitem')).toHaveLength(2);
  });
});
