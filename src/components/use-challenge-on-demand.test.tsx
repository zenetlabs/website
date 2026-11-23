import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChallengeOnDemand } from '@/components/use-challenge-on-demand';
import { ChallengeCancelled } from '@/lib/challenge-cancel';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/track', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/track')>()),
  track,
}));

function mount() {
  const view = renderHook(() => useChallengeOnDemand('chat'));
  const instance = { reset: vi.fn(), execute: vi.fn() };
  // The fake stands in for the widget's imperative handle.
  Object.assign(view.result.current.widget, { current: instance });
  return { ...view, instance };
}

function setup() {
  const view = mount();
  act(() => view.result.current.widgetProps.onLoad());
  return view;
}

beforeEach(() => {
  track.mockReset();
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
    const { result } = setup();
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
  });

  it('survives an interactive timeout: the refreshed checkbox still answers once', async () => {
    const { result } = setup();
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

  it("keeps waiting through an error: a token from Turnstile's own retry resolves the wait", async () => {
    const { result } = setup();
    const token = result.current.token();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
  });

  it('once a checkbox has shown, only the 3-minute limit ends the wait', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('too long');
    const pending = vi.fn();
    void token.catch(pending);
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(60_000);
      result.current.widgetProps.onInteractive(false);
      vi.advanceTimersByTime(60_000);
    });
    expect(pending).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await settled;
  });

  it('fails at the third error in one wait and resets the widget', async () => {
    const { result, instance } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('failed');
    const pending = vi.fn();
    void token.catch(pending);
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onError('300030'));
    await Promise.resolve();
    expect(pending).not.toHaveBeenCalled();
    act(() => result.current.widgetProps.onError('300030'));
    await settled;
    expect(instance.reset).toHaveBeenCalledTimes(2);
  });

  it('fails at once on an unsupported browser', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('failed');
    act(() => result.current.widgetProps.onError('unsupported'));
    await settled;
  });

  it('an error with nobody waiting changes nothing, and the next wait counts from zero', async () => {
    const { result } = setup();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onError('300030'));
    const token = result.current.token();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
    const next = result.current.token();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onToken('tok-2'));
    await expect(next).resolves.toBe('tok-2');
  });

  it('interactive is true while the checkbox shows and false once the wait settles', async () => {
    const { result } = setup();
    expect(result.current.interactive).toBe(false);
    const token = result.current.token();
    act(() => result.current.widgetProps.onInteractive(true));
    expect(result.current.interactive).toBe(true);
    act(() => result.current.widgetProps.onToken('tok'));
    await token;
    expect(result.current.interactive).toBe(false);
  });

  it('a timeout failure resets the widget', async () => {
    const { result, instance } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('timed out');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await settled;
    expect(instance.reset).toHaveBeenCalledTimes(2);
  });

  it('cancel() ends the wait as a cancel, not a failure, and resets the widget', async () => {
    const { result, instance } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toBeInstanceOf(ChallengeCancelled);
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => result.current.cancel());
    await settled;
    expect(instance.reset).toHaveBeenCalledTimes(2);
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

  it('waits for the widget to load, then runs it', async () => {
    const { result, instance } = mount();
    const token = result.current.token();
    expect(instance.execute).not.toHaveBeenCalled();
    act(() => result.current.widgetProps.onLoad());
    expect(instance.execute).toHaveBeenCalledOnce();
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
  });

  it('gives up after 20 s when the widget never loads, and reports it as not_loaded', async () => {
    const { result } = mount();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('never loaded');
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    await settled;
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('challenge_error', {
      challenge: 'chat',
      code: 'not_loaded',
    });
  });

  it('reports its own timeouts as timeout and limit, and Turnstile errors not at all', async () => {
    const { result } = setup();
    const solo = expect(result.current.token()).rejects.toThrow('timed out');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await solo;
    expect(track).toHaveBeenLastCalledWith('challenge_error', {
      challenge: 'chat',
      code: 'timeout',
    });
    const long = expect(result.current.token()).rejects.toThrow('too long');
    act(() => result.current.widgetProps.onInteractive(true));
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    await long;
    expect(track).toHaveBeenLastCalledWith('challenge_error', {
      challenge: 'chat',
      code: 'limit',
    });
    const failed = expect(result.current.token()).rejects.toThrow('failed');
    act(() => result.current.widgetProps.onError('unsupported'));
    await failed;
    expect(track).toHaveBeenCalledTimes(2);
  });

  it.each(['unsupported', '110100', '110200', '400021', '200100'])(
    'fails at once on %s, which Turnstile never retries',
    async (code) => {
      const { result } = setup();
      const token = result.current.token();
      const settled = expect(token).rejects.toThrow('failed');
      act(() => result.current.widgetProps.onError(code));
      await settled;
    },
  );

  it.each(['110600', '110620', '200500', '300030', '600010'])(
    'counts %s toward the three errors, since Turnstile retries it',
    async (code) => {
      const { result } = setup();
      const token = result.current.token();
      const pending = vi.fn();
      void token.catch(pending);
      act(() => result.current.widgetProps.onError(code));
      act(() => result.current.widgetProps.onError(code));
      await Promise.resolve();
      expect(pending).not.toHaveBeenCalled();
      act(() => result.current.widgetProps.onToken('tok'));
      await expect(token).resolves.toBe('tok');
    },
  );

  it('an error Turnstile does not retry, before any wait, fails the next wait at once', async () => {
    const { result, instance } = setup();
    act(() => result.current.widgetProps.onError('400020'));
    await expect(result.current.token()).rejects.toThrow('failed');
    expect(instance.execute).not.toHaveBeenCalled();
  });

  it('an error before the wait does not count toward it', async () => {
    const { result } = setup();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onError('300030'));
    const token = result.current.token();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onToken('tok'));
    await expect(token).resolves.toBe('tok');
  });

  it('counts an error while waiting for the widget to load', async () => {
    const { result, instance } = mount();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('failed');
    act(() => result.current.widgetProps.onError('200500'));
    act(() => result.current.widgetProps.onError('200500'));
    act(() => result.current.widgetProps.onError('200500'));
    await settled;
    expect(instance.execute).not.toHaveBeenCalled();
  });

  it('runs the widget once when onLoad fires twice', async () => {
    const { result, instance } = mount();
    const token = result.current.token();
    act(() => result.current.widgetProps.onLoad());
    act(() => result.current.widgetProps.onLoad());
    expect(instance.execute).toHaveBeenCalledOnce();
    act(() => result.current.widgetProps.onToken('tok'));
    await token;
  });

  it('a token that arrives after a failure never resolves a later wait', async () => {
    const { result } = setup();
    const failed = expect(result.current.token()).rejects.toThrow('timed out');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await failed;
    act(() => result.current.widgetProps.onToken('stale'));
    const second = result.current.token();
    const resolved = vi.fn();
    void second.then(resolved);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();
    act(() => result.current.widgetProps.onToken('fresh'));
    await expect(second).resolves.toBe('fresh');
  });

  it('an error ends the checkbox it came from, so a retry that never answers cannot wait 180 s', async () => {
    const { result } = setup();
    const token = result.current.token();
    const settled = expect(token).rejects.toThrow('timed out');
    act(() => result.current.widgetProps.onInteractive(true));
    expect(result.current.interactive).toBe(true);
    act(() => {
      vi.advanceTimersByTime(60_000);
      result.current.widgetProps.onInteractive(false);
      result.current.widgetProps.onError('300030');
    });
    expect(result.current.interactive).toBe(false);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await settled;
  });

  it('reports nothing when the wait succeeds or is cancelled', async () => {
    const { result } = setup();
    const token = result.current.token();
    act(() => result.current.widgetProps.onError('300030'));
    act(() => result.current.widgetProps.onToken('tok'));
    await token;
    const cancelled = expect(result.current.token()).rejects.toBeInstanceOf(
      ChallengeCancelled,
    );
    act(() => result.current.cancel());
    await cancelled;
    expect(track).not.toHaveBeenCalled();
  });
});
