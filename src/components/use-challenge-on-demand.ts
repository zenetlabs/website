import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { type RefObject, useEffect, useRef, useState } from 'react';
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
type Deadline = { ms: number; message: string; code: ChallengeCode };

// The widget has not loaded at all (blocked script, dead network).
const LOAD: Deadline = {
  ms: 20_000,
  message: 'challenge never loaded',
  code: 'not_loaded',
};
// While the widget works alone, before any checkbox has shown.
const SOLO: Deadline = {
  ms: 30_000,
  message: 'challenge timed out',
  code: 'timeout',
};
// The cap on the whole wait, from token(), however long a checkbox shows.
const LIMIT: Deadline = {
  ms: CHALLENGE_WAIT_LIMIT_MS,
  message: 'challenge took too long',
  code: 'limit',
};

type Timer = ReturnType<typeof setTimeout>;

// One wait for a token. It owns its error count and its timers, so a new wait
// starts clean and a settled one leaves nothing running.
type Wait = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  errors: number;
  // reset() and execute() have run for this wait
  running: boolean;
  checkbox: boolean;
  // LOAD until the widget runs, then SOLO; none while a checkbox shows
  phase: Timer | undefined;
  limit: Timer;
};

// Takes the wait off the hook and stops its timers.
function detach(wait: RefObject<Wait | null>) {
  const current = wait.current;
  wait.current = null;
  if (current === null) return null;
  clearTimeout(current.phase);
  clearTimeout(current.limit);
  return current;
}

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
  const wait = useRef<Wait | null>(null);
  const loaded = useRef(false);
  // An error Turnstile will not retry, even one that came before any wait.
  const notRetried = useRef(false);
  const alive = useRef(true);
  const [interactive, setInteractive] = useState(false);

  function deadline(limit: Deadline) {
    return setTimeout(() => fail(limit), limit.ms);
  }

  function arm(current: Wait, next: Deadline | null) {
    clearTimeout(current.phase);
    current.phase = next === null ? undefined : deadline(next);
  }

  function settle(outcome: string | Error) {
    const current = detach(wait);
    if (current === null) return;
    if (current.checkbox) setInteractive(false);
    if (typeof outcome === 'string') current.resolve(outcome);
    else current.reject(outcome);
  }

  // `code` is set for the hook's own timeouts: Turnstile's errors were already
  // recorded by the widget.
  function fail({ message, code }: { message: string; code?: ChallengeCode }) {
    if (code !== undefined)
      track('challenge_error', { challenge: action, code });
    settle(new Error(message));
    widget.current?.reset();
  }

  function run(current: Wait, instance: TurnstileInstance) {
    current.running = true;
    arm(current, SOLO);
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
        detach(wait)?.reject(new ChallengeCancelled());
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
        const current: Wait = {
          resolve,
          reject,
          errors: 0,
          running: false,
          checkbox: false,
          phase: undefined,
          limit: deadline(LIMIT),
        };
        wait.current = current;
        const instance = widget.current;
        if (loaded.current && instance) run(current, instance);
        else arm(current, LOAD);
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
        const current = wait.current;
        const instance = widget.current;
        if (current === null || current.running || !instance) return;
        run(current, instance);
      },
      onToken: (token: string) => {
        if (token === '') return;
        notRetried.current = false;
        settle(token);
      },
      onError: (code: string) => {
        if (NOT_RETRIED.has(code)) notRetried.current = true;
        const current = wait.current;
        if (current === null) return;
        current.errors += 1;
        if (notRetried.current || current.errors >= MAX_ERRORS) {
          fail({ message: 'challenge failed' });
          return;
        }
        // Turnstile retries alone, with no checkbox: the solo limit applies
        // again, so a retry that never answers cannot wait out the 180 s.
        if (current.running) arm(current, SOLO);
      },
      onInteractive: (active: boolean) => {
        const current = wait.current;
        if (current === null) return;
        if (current.checkbox !== active) {
          current.checkbox = active;
          setInteractive(active);
        }
        if (active && current.running) arm(current, null);
      },
    },
  };
}
