import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatLauncher,
  LauncherButton,
  PanelBoundary,
} from '@/components/chat-launcher';

const state = vi.hoisted(() => {
  vi.stubGlobal('__ASSISTANT__', true);
  return { locale: 'en', hydrated: true };
});
const track = vi.hoisted(() => vi.fn());
const panelLoaded = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: state.locale }),
  useHydrated: () => state.hydrated,
}));
vi.mock('@/lib/track', () => ({ track }));
vi.mock('@/components/chat/chat-panel', () => {
  panelLoaded();
  return {
    ChatPanel: ({
      locale,
      copy,
      booking,
      onClose,
    }: {
      locale: string;
      copy: { title: string };
      booking: boolean;
      onClose: () => void;
    }) => (
      <div role="dialog" aria-label={copy.title}>
        {locale}:{String(booking)}
        <button type="button" onClick={onClose}>
          close panel
        </button>
      </div>
    ),
  };
});

beforeEach(() => {
  state.locale = 'en';
  state.hydrated = true;
  track.mockReset();
});

describe('ChatLauncher', () => {
  it('renders nothing on the server and before hydration', () => {
    state.hydrated = false;
    expect(renderToString(<ChatLauncher />)).toBe('');
    const { container } = render(<ChatLauncher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is a labelled dialog button with a visible name', () => {
    render(<ChatLauncher />);
    const button = screen.getByRole('button', {
      name: 'Open the AI assistant',
    });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('data-chat-launcher');
    expect(button).toHaveTextContent('AI assistant');
  });

  it('speaks Spanish on the Spanish site', () => {
    state.locale = 'es';
    render(<ChatLauncher />);
    expect(
      screen.getByRole('button', { name: 'Abrir el asistente de IA' }),
    ).toHaveTextContent('Asistente IA');
  });

  it('imports the panel only on interaction, not on render', async () => {
    const before = panelLoaded.mock.calls.length;
    render(<ChatLauncher />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(panelLoaded.mock.calls.length).toBe(before);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('prefetches the panel once on pointerenter, focus or touchstart', async () => {
    const user = userEvent.setup();
    render(<ChatLauncher />);
    const button = screen.getByRole('button');
    await user.hover(button);
    fireEvent.touchStart(button);
    button.focus();
    await waitFor(() => expect(panelLoaded).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tracks chat_open and flips aria-expanded when it opens', () => {
    const onOpen = vi.fn();
    const { rerender } = render(
      <LauncherButton open={false} onOpen={onOpen} locale="en" />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Open the AI assistant' }),
    );
    expect(track).toHaveBeenCalledWith('chat_open');
    expect(onOpen).toHaveBeenCalledTimes(1);
    rerender(<LauncherButton open onOpen={onOpen} locale="en" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('PanelBoundary', () => {
  function Broken(): never {
    throw new Error('Failed to fetch dynamically imported module');
  }

  it('shows the fallback instead of an empty page when the panel cannot load', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PanelBoundary fallback={<p role="alert">use the contact form</p>}>
        <Broken />
      </PanelBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('use the contact form');
    log.mockRestore();
  });

  it('renders its children when nothing fails', () => {
    render(
      <PanelBoundary fallback={<p>fallback</p>}>
        <p>panel</p>
      </PanelBoundary>,
    );
    expect(screen.getByText('panel')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });
});
