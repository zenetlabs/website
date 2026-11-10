import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useEffect, useRef } from 'react';
import { ChallengeCancelled } from '@/lib/challenge-cancel';

// While the widget works alone; an interactive checkbox pauses this.
const SOLO_LIMIT_MS = 30_000;
// However long Turnstile keeps asking (its checkbox refreshes after its own
// timeout), a wait never outlasts this.
const WAIT_LIMIT_MS = 180_000;

type Waiter = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

// For the panels that run the challenge themselves ('execute' mode): `token()`
// resets the widget, runs it and waits for its answer. Only an error or an
// unsupported browser fail at once; `cancel()` (and closing the panel) ends
// the wait with ChallengeCancelled, which reports no failure.
export function useChallengeOnDemand(onFailure?: () => void) {
  const widget = useRef<TurnstileInstance>(undefined);
  const waiter = useRef<Waiter | null>(null);
  const solo = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = useRef<ReturnType<typeof setTimeout>>(undefined);

  function settle(outcome: string | Error) {
    clearTimeout(solo.current);
    clearTimeout(limit.current);
    const current = waiter.current;
    waiter.current = null;
    if (current === null) return;
    if (typeof outcome === 'string') current.resolve(outcome);
    else current.reject(outcome);
  }

  function armSolo() {
    clearTimeout(solo.current);
    solo.current = setTimeout(
      () => settle(new Error('challenge timed out')),
      SOLO_LIMIT_MS,
    );
  }

  useEffect(
    () => () => {
      clearTimeout(solo.current);
      clearTimeout(limit.current);
      waiter.current?.reject(new ChallengeCancelled());
      waiter.current = null;
    },
    [],
  );

  return {
    widget,
    token: () =>
      new Promise<string>((resolve, reject) => {
        const instance = widget.current;
        if (!instance) {
          reject(new Error('no challenge'));
          return;
        }
        settle(new ChallengeCancelled());
        waiter.current = { resolve, reject };
        armSolo();
        limit.current = setTimeout(
          () => settle(new Error('challenge took too long')),
          WAIT_LIMIT_MS,
        );
        instance.reset();
        instance.execute();
      }),
    cancel: () => {
      settle(new ChallengeCancelled());
      widget.current?.reset();
    },
    widgetProps: {
      instance: widget,
      onToken: (token: string) => {
        if (token !== '') settle(token);
      },
      onError: () => {
        settle(new Error('challenge failed'));
        onFailure?.();
      },
      onInteractive: (active: boolean) => {
        if (waiter.current === null) return;
        if (active) clearTimeout(solo.current);
        else armSolo();
      },
    },
  };
}
