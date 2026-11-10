import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { noop } from '@/lib/time';

type SubmitLabels = { idle: string; pending: string; verifying: string };

// However long Turnstile keeps asking (its checkbox refreshes after its own
// timeout), a waiting submit gives up after this.
const WAIT_LIMIT_MS = 180_000;

// The Turnstile state the forms share: nothing mounts until the first focus,
// and a failed submit clears the token and asks the widget for a new one.
// A submit before the token exists waits for it, so the button is never a dead
// control: it reads "checking" until the check answers, then the request goes.
// `onFailure` learns whether a submit was waiting (it is dropped).
export function useChallenge(onFailure: (waited: boolean) => void = noop) {
  const instance = useRef<TurnstileInstance>(undefined);
  const waiting = useRef<((token: string) => void) | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [engaged, setEngaged] = useState(false);
  const [token, setTokenState] = useState('');
  const [verifying, setVerifying] = useState(false);

  // A token that arrives after the form is gone submits nothing.
  useEffect(
    () => () => {
      waiting.current = null;
      clearTimeout(limit.current);
    },
    [],
  );

  // Nothing waits any more; says whether a submit was.
  function drop(): boolean {
    clearTimeout(limit.current);
    const waited = waiting.current !== null;
    waiting.current = null;
    setVerifying(false);
    return waited;
  }

  function fail() {
    setTokenState('');
    onFailure(drop());
  }

  function setToken(next: string) {
    setTokenState(next);
    const run = waiting.current;
    if (next === '' || run === null) return;
    drop();
    run(next);
  }

  function withToken(run: (token: string) => void) {
    if (token !== '') {
      run(token);
      return;
    }
    waiting.current = run;
    setVerifying(true);
    setEngaged(true);
    clearTimeout(limit.current);
    limit.current = setTimeout(fail, WAIT_LIMIT_MS);
  }

  return {
    instance,
    engaged,
    token,
    setToken,
    engage: () => setEngaged(true),
    retry: () => {
      setTokenState('');
      instance.current?.reset();
    },
    // The form's submit handler: read the form, let `start` reset the form's
    // status (or refuse), then run once a token exists.
    onSubmit:
      (
        run: (data: FormData, token: string) => void,
        start?: (data: FormData) => boolean,
      ) =>
      (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (start && !start(data)) return;
        withToken((next) => run(data, next));
      },
    widgetProps: { engaged, instance, onToken: setToken, onError: fail },
    // The visitor left (a dialog closed): a token that arrives later submits
    // nothing, and the widget starts over without its checkbox or hint.
    cancel: () => {
      drop();
      instance.current?.reset();
    },
    submitLabel: (pending: boolean, labels: SubmitLabels): string => {
      if (pending) return labels.pending;
      return verifying ? labels.verifying : labels.idle;
    },
    busy: verifying,
  };
}
