import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceCallout } from '@/components/voice-button';

const state = vi.hoisted(() => {
  vi.stubGlobal('__VOICE__', true);
  return { locale: 'en', hydrated: true, available: true };
});
const openVoice = vi.hoisted(() => vi.fn());
const prefetchVoice = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouteContext: ({
    select,
  }: {
    select: (context: { locale: string }) => unknown;
  }) => select({ locale: state.locale }),
  useHydrated: () => state.hydrated,
  useRouter: () => ({ history: { push } }),
}));
vi.mock('@/lib/voice-entry', () => ({
  openVoice,
  prefetchVoice,
  voiceAvailable: () => state.available,
}));

const PROPS = { text: 'Prefer to talk?', button: 'Talk to the assistant' };

beforeEach(() => {
  Object.assign(state, { locale: 'en', hydrated: true, available: true });
  openVoice.mockReset();
  prefetchVoice.mockReset();
  push.mockReset();
});

describe('VoiceCallout', () => {
  it('renders nothing on the server and before hydration', () => {
    state.hydrated = false;
    expect(renderToString(<VoiceCallout {...PROPS} />)).toBe('');
    const { container } = render(<VoiceCallout {...PROPS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a locale without an agent', () => {
    state.available = false;
    const { container } = render(<VoiceCallout {...PROPS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is a dialog button with its visible name and the lead sentence', () => {
    render(<VoiceCallout {...PROPS} />);
    const button = screen.getByRole('button', { name: PROPS.button });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('data-voice-button');
    expect(button).toBeEnabled();
    expect(screen.getByText(PROPS.text)).toBeInTheDocument();
  });

  it('opens the panel in the locale of the page, with a router push, and prefetches on hover', async () => {
    state.locale = 'es';
    render(<VoiceCallout {...PROPS} />);
    const button = screen.getByRole('button');
    await userEvent.hover(button);
    expect(prefetchVoice).toHaveBeenCalledWith('es');
    await userEvent.click(button);
    expect(openVoice).toHaveBeenCalledWith('es', expect.any(Function));
    openVoice.mock.calls[0]?.[1]('/es/precios');
    expect(push).toHaveBeenCalledWith('/es/precios');
  });
});
