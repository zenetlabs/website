import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChallengeOnDemand } from '@/components/use-challenge-on-demand';
import { ChallengeCancelled } from '@/lib/challenge-cancel';

function setup(onFailure = vi.fn()) {
  const view = renderHook(() => useChallengeOnDemand(onFailure));
  const instance = { reset: vi.fn(), execute: vi.fn() };
  // The fake stands in for the widget's imperative handle.
  Object.assign(view.result.current.widget, { current: instance });
  return { ...view, instance, onFailure };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useChallengeOnDemand', () => {
  it('resets and runs the widget, then resolves with its token', async () => {
    const { result, instance } = setup();
    const token = result.current.token();
    expect(instance.reset).toHaveBeenCalledOnce();
    expect(instance.execute).toHaveBeenCalledOnce();
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
  });

  it('gives up after 30 s while the widget works alone', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('timed out');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await settled;
  });

  it('waits past the 30 s limit while the checkbox shows, then proceeds', async () => {
    const { result, onFailure } = setup();
    const token = result.current.token();
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(150_000);
    });
    act(() => {
      result.current.widgetProps.onInteractive(false);
      result.current.widgetProps.onToken('tok');
    });
    await expect(token).resolves.toBe('tok');
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('survives an interactive timeout: the refreshed checkbox still answers once', async () => {
    const { result, onFailure } = setup();
    const token = result.current.token();
    const resolved = vi.fn();
    void token.then(resolved);
    // The widget reports Turnstile's timeout as a fresh checkbox.
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(60_000);
      result.current.widgetProps.onInteractive(true);
      vi.advanceTimersByTime(60_000);
    });
    act(() => {
      result.current.widgetProps.onInteractive(false);
      result.current.widgetProps.onToken('tok');
      result.current.widgetProps.onToken('tok-2');
    });
    await expect(token).resolves.toBe('tok');
    expect(resolved).toHaveBeenCalledOnce();
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('gives up after 3 minutes however long the checkbox keeps showing', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('too long');
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(179_999);
    });
    act(() => {
      vi.advanceTimersByTime(1);
    });
    await settled;
  });

  it('fails at once on an error', async () => {
    const { result, onFailure } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('failed');
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => result.current.widgetProps.onError());
    await settled;
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it('cancel() ends the wait as a cancel, not a failure, and resets the widget', async () => {
    const { result, instance, onFailure } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toBeInstanceOf(ChallengeCancelled);
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => result.current.cancel());
    await settled;
    expect(instance.reset).toHaveBeenCalledTimes(2);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('counts 30 s again once the checkbox has gone without a token', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('timed out');
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(60_000);
      result.current.widgetProps.onInteractive(false);
      vi.advanceTimersByTime(29_000);
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    await settled;
  });

  it('ignores an expired token and a checkbox nobody is waiting for', async () => {
    const { result } = setup();
    act(() => result.current.widgetProps.onInteractive(true));
    const token = result.current.token();
    act(() => result.current.widgetProps.onToken(''));
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
  });

  it('ends the wait when the panel closes', async () => {
    const { result, unmount } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toBeInstanceOf(ChallengeCancelled);
    unmount();
    await settled;
  });

  it('refuses before the widget exists', async () => {
    const { result } = renderHook(() => useChallengeOnDemand());
    await expect(result.current.token()).rejects.toThrow('no challenge');
  });
});
