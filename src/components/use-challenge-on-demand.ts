import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useEffect, useRef, useState } from 'react';
import {
  CHALLENGE_WAIT_LIMIT_MS,
  ChallengeCancelled,
} from '@/lib/challenge-cancel';
import { type ChallengeAction, type ChallengeCode, track } from '@/lib/track';

// Turnstile retries on its own (`retry: 'auto'`, pinned in `LazyTurnstile`) and
// calls the error callback each time. Measured with the always-failing testing
// key: errors about 11 s apart, so the third lands about 25 s in, inside the
// 30 s solo limit.
const MAX_ERRORS = 3;
// Errors Turnstile never retries (Cloudflare's client-side error codes, the
// ones marked not retryable): the wait fails at once.
const NOT_RETRIED: ReadonlySet<string> = new Set([
  'unsupported',
  '110100',
  '110110',
  '110200',
  '200100',
  '400020',
  '400021',
  '400070',
]);
// The widget has not loaded at all (blocked script, dead network).
const LOAD_LIMIT_MS = 20_000;
// While the widget works alone, before any checkbox has shown.
const SOLO_LIMIT_MS = 30_000;

type Waiter = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

// For the panels that run the challenge themselves ('execute' mode): `token()`
// waits for the widget to load, resets it, runs it and waits for its answer. A
// wait ends with a token, with a failure (the widget never loaded in 20 s, the
// third error, an error Turnstile does not retry, 30 s of the widget working
// alone, 180 s once a checkbox has shown) or with ChallengeCancelled, which
// reports no failure: `cancel()` and closing the panel. A failure resets the
// widget, so nothing runs on in the background. The widget reports every
// Turnstile error code to GA4; the hook adds only its own timeouts.
export function useChallengeOnDemand(
  action: ChallengeAction,
  onLoad?: () => void,
) {
  const widget = useRef<TurnstileInstance>(undefined);
  const waiter = useRef<Waiter | null>(null);
  const loaded = useRef(false);
  // An error Turnstile will not retry, even one that came before any wait.
  const notRetried = useRef(false);
  const alive = useRef(true);
  const load = useRef<ReturnType<typeof setTimeout>>(undefined);
  const solo = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errors = useRef(0);
  const started = useRef(false);
  const showing = useRef(false);
  const [interactive, setInteractive] = useState(false);

  function showCheckbox(active: boolean) {
    if (showing.current === active) return;
    showing.current = active;
    setInteractive(active);
  }

  function clearTimers() {
    clearTimeout(load.current);
    clearTimeout(solo.current);
    clearTimeout(limit.current);
  }

  function settle(outcome: string | Error) {
    clearTimers();
    showCheckbox(false);
    started.current = false;
    const current = waiter.current;
    waiter.current = null;
    if (current === null) return;
    if (typeof outcome === 'string') current.resolve(outcome);
    else current.reject(outcome);
  }

  // `code` is set for the hook's own timeouts: Turnstile's errors were already
  // recorded by the widget.
  function fail(message: string, code?: ChallengeCode) {
    if (code !== undefined)
      track('challenge_error', { challenge: action, code });
    settle(new Error(message));
    widget.current?.reset();
  }

  function armSolo() {
    clearTimeout(solo.current);
    solo.current = setTimeout(
      () => fail('challenge timed out', 'timeout'),
      SOLO_LIMIT_MS,
    );
  }

  function run(instance: TurnstileInstance) {
    started.current = true;
    armSolo();
    instance.reset();
    instance.execute();
  }

  // A remount in between (StrictMode) keeps the wait: the effect runs again
  // before the microtask looks.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      queueMicrotask(() => {
        if (alive.current) return;
        clearTimeout(load.current);
        clearTimeout(solo.current);
        clearTimeout(limit.current);
        waiter.current?.reject(new ChallengeCancelled());
        waiter.current = null;
      });
    };
  }, []);

  return {
    widget,
    interactive,
    token: () =>
      new Promise<string>((resolve, reject) => {
        settle(new ChallengeCancelled());
        if (notRetried.current) {
          reject(new Error('challenge failed'));
          return;
        }
        waiter.current = { resolve, reject };
        errors.current = 0;
        limit.current = setTimeout(
          () => fail('challenge took too long', 'limit'),
          CHALLENGE_WAIT_LIMIT_MS,
        );
        const instance = widget.current;
        if (loaded.current && instance) {
          run(instance);
          return;
        }
        load.current = setTimeout(
          () => fail('challenge never loaded', 'not_loaded'),
          LOAD_LIMIT_MS,
        );
      }),
    cancel: () => {
      settle(new ChallengeCancelled());
      widget.current?.reset();
    },
    widgetProps: {
      instance: widget,
      onLoad: () => {
        loaded.current = true;
        onLoad?.();
        const instance = widget.current;
        if (waiter.current === null || started.current || !instance) return;
        clearTimeout(load.current);
        run(instance);
      },
      onToken: (token: string) => {
        if (token === '') return;
        notRetried.current = false;
        settle(token);
      },
      onError: (code: string) => {
        if (NOT_RETRIED.has(code)) notRetried.current = true;
        if (waiter.current === null) return;
        errors.current += 1;
        if (notRetried.current || errors.current >= MAX_ERRORS) {
          fail('challenge failed');
          return;
        }
        // Turnstile retries alone, with no checkbox: the solo limit applies
        // again, so a retry that never answers cannot wait out the 180 s.
        if (started.current) armSolo();
      },
      onInteractive: (active: boolean) => {
        if (waiter.current === null) return;
        showCheckbox(active);
        if (active) clearTimeout(solo.current);
      },
    },
  };
}
