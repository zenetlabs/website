import type { TurnstileInstance } from '@marsidev/react-turnstile';
import {
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

type SubmitLabels = { idle: string; pending: string; verifying: string };

// The Turnstile state the forms share: nothing mounts until the first focus,
// and a failed submit clears the token and asks the widget for a new one.
// A submit before the token exists waits for it, so the button is never a dead
// control: it reads "checking" until the check answers, then the request goes.
export function useChallenge() {
  const instance = useRef<TurnstileInstance>(undefined);
  const waiting = useRef<((token: string) => void) | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [token, setTokenState] = useState('');
  const [verifying, setVerifying] = useState(false);

  // A token that arrives after the form is gone submits nothing.
  useEffect(
    () => () => {
      waiting.current = null;
    },
    [],
  );

  function setToken(next: string) {
    setTokenState(next);
    const run = waiting.current;
    if (next === '' || run === null) return;
    waiting.current = null;
    setVerifying(false);
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
    // The widget's token and failure in one place; `onFailure` learns whether
    // a submit was waiting (it is dropped).
    widgetProps: (onFailure: (waited: boolean) => void) => ({
      engaged,
      instance,
      onToken: setToken,
      onError: () => {
        const waited = waiting.current !== null;
        waiting.current = null;
        setVerifying(false);
        setToken('');
        onFailure(waited);
      },
    }),
    // The visitor left (a dialog closed): a token that arrives later submits nothing.
    cancel: () => {
      waiting.current = null;
      setVerifying(false);
    },
    submitLabel: (pending: boolean, labels: SubmitLabels): string => {
      if (pending) return labels.pending;
      return verifying ? labels.verifying : labels.idle;
    },
    busy: verifying,
  };
}

const TOKEN_TIMEOUT_MS = 30_000;

// A fresh token on demand, for the panels that run the challenge themselves
// ('execute' mode): reset the widget, run it, wait for its answer.
export function challengeToken(
  widget: RefObject<TurnstileInstance | undefined>,
): () => Promise<string> {
  return async () => {
    const instance = widget.current;
    if (!instance) throw new Error('no challenge');
    instance.reset();
    instance.execute();
    return instance.getResponsePromise(TOKEN_TIMEOUT_MS);
  };
}
