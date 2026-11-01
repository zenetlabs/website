import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef, useState } from 'react';

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
