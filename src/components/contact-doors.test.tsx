import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ContactDoorItem, ContactDoors } from '@/components/contact-doors';
import { showContactForm } from '@/lib/contact-door';

const state = vi.hoisted(() => ({ hydrated: true }));
const track = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useHydrated: () => state.hydrated,
}));
vi.mock('@/lib/track', () => ({ track }));

function item(id: ContactDoorItem['id']): ContactDoorItem {
  return {
    id,
    copy: { title: `Door ${id}`, text: `Hint ${id}` },
    icon: null,
    panel: <p>Panel {id}</p>,
  };
}

const ALL = [item('book'), item('message'), item('ai')];

function view(items: readonly ContactDoorItem[] = ALL) {
  return render(
    <>
      <h1 id="title">Talk to us</h1>
      <ContactDoors items={items} labelledBy="title" />
    </>,
  );
}

const tab = (name: string | RegExp) => screen.getByRole('tab', { name });

beforeEach(() => {
  state.hydrated = true;
  track.mockReset();
});

describe('ContactDoors before hydration', () => {
  it('renders plain in-page links and every panel, the message one open', () => {
    state.hydrated = false;
    const { container } = view();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    const links = [...container.querySelectorAll('nav a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '#door-book',
      '#door-message',
      '#door-ai',
    ]);
    const panels = [...container.querySelectorAll('[data-door-panel]')];
    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.hasAttribute('data-open'))).toEqual([
      false,
      true,
      false,
    ]);
  });
});

describe('ContactDoors once hydrated', () => {
  it('is a tablist named by the page title with the message tab selected', () => {
    view();
    expect(screen.getByRole('tablist', { name: 'Talk to us' })).toBeVisible();
    expect(tab(/Door message/).getAttribute('aria-selected')).toBe('true');
    expect(tab(/Door book/).getAttribute('aria-selected')).toBe('false');
    expect(tab(/Door message/).getAttribute('tabindex')).toBe('0');
    expect(tab(/Door book/).getAttribute('tabindex')).toBe('-1');
    expect(tab(/Door message/).getAttribute('aria-controls')).toBe(
      'door-message',
    );
  });

  it('labels each panel by its tab and focuses only the open one', () => {
    const { container } = view();
    const open = container.querySelector('#door-message');
    expect(open?.getAttribute('role')).toBe('tabpanel');
    expect(open?.getAttribute('aria-labelledby')).toBe('door-message-tab');
    expect(open?.getAttribute('tabindex')).toBe('0');
    expect(
      container.querySelector('#door-book')?.getAttribute('tabindex'),
    ).toBeNull();
  });

  it('selects a door on a plain click and tracks it once', () => {
    view();
    fireEvent.click(tab(/Door ai/));
    expect(tab(/Door ai/).getAttribute('aria-selected')).toBe('true');
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('cta_click', {
      cta_id: 'contact_door_ai',
    });
    fireEvent.click(tab(/Door ai/));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('leaves a modified click to the browser', () => {
    view();
    const notPrevented = fireEvent.click(tab(/Door book/), { ctrlKey: true });
    expect(notPrevented).toBe(true);
    expect(tab(/Door message/).getAttribute('aria-selected')).toBe('true');
    expect(track).not.toHaveBeenCalled();
  });

  it('moves and selects with the arrows, wrapping, and focus follows', () => {
    view();
    tab(/Door message/).focus();
    fireEvent.keyDown(tab(/Door message/), { key: 'ArrowRight' });
    expect(tab(/Door ai/)).toHaveFocus();
    expect(tab(/Door ai/).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(tab(/Door ai/), { key: 'ArrowRight' });
    expect(tab(/Door book/)).toHaveFocus();
    fireEvent.keyDown(tab(/Door book/), { key: 'ArrowLeft' });
    expect(tab(/Door ai/)).toHaveFocus();
    fireEvent.keyDown(tab(/Door ai/), { key: 'ArrowUp' });
    expect(tab(/Door message/)).toHaveFocus();
    fireEvent.keyDown(tab(/Door message/), { key: 'ArrowDown' });
    expect(tab(/Door ai/)).toHaveFocus();
  });

  it('goes to the first and last door with Home and End', () => {
    view();
    tab(/Door message/).focus();
    fireEvent.keyDown(tab(/Door message/), { key: 'End' });
    expect(tab(/Door ai/)).toHaveFocus();
    fireEvent.keyDown(tab(/Door ai/), { key: 'Home' });
    expect(tab(/Door book/)).toHaveFocus();
    expect(tab(/Door book/).getAttribute('aria-selected')).toBe('true');
  });

  it('ignores arrows held with a modifier key', () => {
    view();
    tab(/Door message/).focus();
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) {
      const notPrevented = fireEvent.keyDown(tab(/Door message/), {
        key: 'ArrowRight',
        [modifier]: true,
      });
      expect(notPrevented).toBe(true);
    }
    expect(tab(/Door message/).getAttribute('aria-selected')).toBe('true');
    expect(track).not.toHaveBeenCalled();
  });

  it('shows `before` until the door is first opened, then the panel, kept after leaving', () => {
    view([
      { ...item('book'), before: <p>Waiting</p> },
      item('message'),
      item('ai'),
    ]);
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.queryByText('Panel book')).toBeNull();
    fireEvent.click(tab(/Door book/));
    expect(screen.getByText('Panel book')).toBeInTheDocument();
    expect(screen.queryByText('Waiting')).toBeNull();
    fireEvent.click(tab(/Door ai/));
    expect(screen.getByText('Panel book')).toBeInTheDocument();
  });

  it('selects with Space without scrolling', () => {
    view();
    const book = tab(/Door book/);
    book.focus();
    const notPrevented = fireEvent.keyDown(book, { key: ' ' });
    expect(notPrevented).toBe(false);
    expect(book.getAttribute('aria-selected')).toBe('true');
  });

  it('reopens the message door for an agent without tracking', () => {
    view();
    fireEvent.click(tab(/Door ai/));
    track.mockReset();
    act(() => showContactForm());
    expect(tab(/Door message/).getAttribute('aria-selected')).toBe('true');
    expect(track).not.toHaveBeenCalled();
  });
});

describe('ContactDoors with fewer doors', () => {
  it('offers two tabs for two items', () => {
    view([item('message'), item('ai')]);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('shows only the panel, no tablist, for one item', () => {
    const { container } = view([item('message')]);
    expect(container.querySelector('nav')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByText('Panel message')).toBeVisible();
  });
});
