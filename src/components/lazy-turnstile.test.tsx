import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { act, render, screen } from '@testing-library/react';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyTurnstile } from '@/components/form-parts';
import type { Locale } from '@/lib/i18n';

type Handlers = {
  onSuccess: (token: string) => void;
  onError: () => void;
  onTimeout: () => void;
  onUnsupported: () => void;
  onBeforeInteractive: () => void;
  onAfterInteractive: () => void;
};

const widget = vi.hoisted(() => {
  const state: { handlers: Handlers | null } = { handlers: null };
  return state;
});

const reset = vi.hoisted(() => vi.fn());

vi.mock('@marsidev/react-turnstile', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    Turnstile: (
      props: Handlers & { ref: React.Ref<{ reset: () => void }> },
    ) => {
      widget.handlers = props;
      useImperativeHandle(props.ref, () => ({ reset }));
      return <span>turnstile widget</span>;
    },
  };
});

function fire(name: keyof Omit<Handlers, 'onSuccess'>) {
  act(() => widget.handlers?.[name]());
}

async function mount(
  locale: Locale = 'en',
  options?: { appearance: 'interaction-only'; execution: 'execute' },
) {
  const onToken = vi.fn();
  const onError = vi.fn();
  const onInteractive = vi.fn();
  const instance: RefObject<TurnstileInstance | undefined> = {
    current: undefined,
  };
  render(
    <LazyTurnstile
      engaged
      action="lead"
      locale={locale}
      options={options}
      instance={instance}
      onToken={onToken}
      onError={onError}
      onInteractive={onInteractive}
    />,
  );
  await screen.findByText('turnstile widget');
  return { onToken, onError, onInteractive, instance };
}

beforeEach(() => {
  widget.handlers = null;
  reset.mockClear();
});

describe('LazyTurnstile', () => {
  it('asks the visitor to tick the box while Turnstile is interactive, without an error', async () => {
    const { onError, onInteractive } = await mount();
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
    fire('onBeforeInteractive');
    expect(screen.getByText('Tick the box to continue.')).toBeInTheDocument();
    expect(onInteractive).toHaveBeenLastCalledWith(true);
    fire('onAfterInteractive');
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
    expect(onInteractive).toHaveBeenLastCalledWith(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('says it in Spanish on Spanish pages, in a polite live region', async () => {
    await mount('es');
    fire('onBeforeInteractive');
    const hint = screen.getByText('Marca la casilla para continuar.');
    expect(hint).toHaveAttribute('aria-live', 'polite');
  });

  it('hands the token on and drops the hint once solved', async () => {
    const { onToken } = await mount();
    fire('onBeforeInteractive');
    fire('onAfterInteractive');
    act(() => widget.handlers?.onSuccess('tok'));
    expect(onToken).toHaveBeenCalledWith('tok');
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
  });

  it.each(['onError', 'onUnsupported'] as const)(
    'reports a failure on %s and drops the hint',
    async (name) => {
      const { onError } = await mount();
      fire('onBeforeInteractive');
      fire(name);
      expect(onError).toHaveBeenCalledOnce();
      expect(screen.queryByText('Tick the box to continue.')).toBeNull();
    },
  );

  it('treats its own timeout as the fresh checkbox it puts up, not a failure', async () => {
    const { onError, onInteractive } = await mount();
    fire('onBeforeInteractive');
    fire('onTimeout');
    expect(onError).not.toHaveBeenCalled();
    expect(onInteractive).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Tick the box to continue.')).toBeInTheDocument();
  });

  it('clears the hint on every reset', async () => {
    const { instance } = await mount();
    fire('onBeforeInteractive');
    act(() => instance.current?.reset());
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.queryByText('Tick the box to continue.')).toBeNull();
  });

  it('keeps the hint line on a form, so it appearing moves nothing', async () => {
    await mount();
    const line = document.querySelector('p[aria-live="polite"]');
    expect(line).toHaveClass('min-h-[1lh]');
    expect(line).not.toHaveClass('empty:sr-only');
  });

  it('keeps the panels free of an empty line until the hint shows', async () => {
    await mount('en', { appearance: 'interaction-only', execution: 'execute' });
    const line = document.querySelector('p[aria-live="polite"]');
    expect(line).toHaveClass('empty:sr-only');
  });
});
