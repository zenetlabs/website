import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeskClose } from '@/components/desk-close';
import { EmphasisTitle } from '@/components/section';
import { home as enHome } from '@/content/en/home';
import { home as esHome } from '@/content/es/home';
import { contactWithMessage } from '@/lib/nav';
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
] as const)('DeskClose (%s)', (locale, home, contact, book) => {
  function view(
    site: SiteFlags,
    extra: { title?: ReactNode; chips?: readonly [string, string] } = {},
  ) {
    return render(
      <DeskClose
        title={extra.title ?? <EmphasisTitle parts={home.contact.title} />}
        lead={home.contact.lead}
        mail={home.contact.mail}
        human={home.contact.human}
        doors={home.doors}
        desk={home.desk}
        chips={extra.chips}
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

  function card() {
    const element = document.querySelector<HTMLElement>('[data-close-desk]');
    if (!element) throw new Error('no card');
    return element;
  }

  it('keeps only the write door, in one column, with chat, voice and booking all off', () => {
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
    expect(list).not.toHaveClass('md:grid-cols-2');
    expect(document.querySelector('.slot-card')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'hello@zenetlabs.com' }),
    ).toHaveAttribute('href', 'mailto:hello@zenetlabs.com');
  });

  it('takes a plain string title and its own chips for the links and the chat', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    const chips = ['First question?', 'Second question?'] as const;
    view(NO_BOOKING, { title: 'A plain title', chips });
    expect(
      screen.getByRole('heading', { level: 2, name: 'A plain title' }),
    ).toBeInTheDocument();
    expect(document.querySelector('#contact-title em')).toBeNull();
    expect(card()).toHaveAttribute('data-page-chips');
    expect(
      [...card().querySelectorAll('.desk-chip')].map((chip) =>
        chip.getAttribute('href'),
      ),
    ).toEqual(chips.map((chip) => contactWithMessage(locale, chip)));
    fireEvent.click(within(card()).getByRole('link', { name: chips[1] }), {
      detail: 1,
    });
    expect(requestChat).toHaveBeenCalledWith(chips[1], card());
  });

  it('keeps home without the page-chips marker', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(NO_BOOKING);
    expect(card()).not.toHaveAttribute('data-page-chips');
  });

  it('heads the card with the shared desk head', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(NO_BOOKING);
    const head = card().querySelector(':scope > .desk-head');
    expect(head?.querySelector('.desk-id')).not.toBeNull();
  });

  it('adds the times to the card while booking is on', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(BOOKING);
    const slots = card().querySelector<HTMLElement>('.slot-card');
    if (!slots) throw new Error('no rail');
    expect(
      within(slots).getByRole('link', { name: home.desk.slots.seeAvailable }),
    ).toHaveAttribute('href', book);
  });

  it('keeps the card with the human words and no badge while the assistant is dark', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(NO_BOOKING);
    expect(
      within(card()).getByRole('heading', { name: home.desk.human.title }),
    ).toBeInTheDocument();
    expect(card().querySelector('.desk-badge')).toBeNull();
  });

  it('links the chips and sends the composer to the contact page with the message', () => {
    vi.stubGlobal('__ASSISTANT__', false);
    view(NO_BOOKING);
    for (const suggestion of home.desk.intro.suggestions) {
      expect(
        within(card()).getByRole('link', { name: suggestion }),
      ).toHaveAttribute('href', contactWithMessage(locale, suggestion));
    }
    const form = card().querySelector('form');
    expect(form).toHaveAttribute('action', contact);
    expect(form).toHaveAttribute('method', 'get');
    expect(
      within(card()).getByLabelText(home.desk.human.label),
    ).toHaveAttribute('name', 'message');
  });

  it('opens the chat out of the card from a chip, tracked as the close', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view(NO_BOOKING);
    const [suggestion = ''] = home.desk.intro.suggestions;
    const chip = within(card()).getByRole('link', { name: suggestion });
    expect(chip).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(chip, { detail: 1 });
    expect(requestChat).toHaveBeenCalledWith(suggestion, card());
    expect(track).toHaveBeenCalledWith('chat_open', { entry: 'close' });
  });

  it('sends what was typed in the composer and clears it', () => {
    vi.stubGlobal('__ASSISTANT__', true);
    view(NO_BOOKING);
    const input = within(card()).getByLabelText(home.desk.label);
    fireEvent.change(input, { target: { value: 'How long does it take?' } });
    const form = card().querySelector('form');
    if (!form) throw new Error('no form');
    fireEvent.submit(form);
    expect(requestChat).toHaveBeenCalledWith('How long does it take?', null);
    expect(track).toHaveBeenCalledWith('chat_open', { entry: 'close' });
    expect(input).toHaveValue('');
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
    expect(card().querySelector('[data-voice-button]')).toBeNull();
  });
});
