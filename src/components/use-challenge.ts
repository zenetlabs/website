import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { type RefObject, useRef, useState } from 'react';

// The Turnstile state both forms share: nothing mounts until the first focus,
// and a failed submit clears the token and asks the widget for a new one.
export function useChallenge() {
  const instance = useRef<TurnstileInstance>(undefined);
  const [engaged, setEngaged] = useState(false);
  const [token, setToken] = useState('');
  return {
    instance,
    engaged,
    token,
    setToken,
    engage: () => setEngaged(true),
    retry: () => {
      setToken('');
      instance.current?.reset();
    },
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
