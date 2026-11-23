import {
  Turnstile,
  type TurnstileInstance,
  type TurnstileProps,
} from '@marsidev/react-turnstile';
import { type Ref, useImperativeHandle, useRef, useState } from 'react';
import { type ChallengeAction, parseChallengeCode, track } from '@/lib/track';

type Props = TurnstileProps & {
  instance: Ref<TurnstileInstance | undefined>;
  action: ChallengeAction;
  hint: string | null;
  onError: (code: string) => void;
  onInteractive?: (active: boolean) => void;
};

// While Turnstile shows its checkbox the visitor is told to tick it: that is
// a step, not a failure. Its own timeout puts up a fresh checkbox, so that is
// one too. An error or an unsupported browser reaches `onError` with its code
// (and the console); Turnstile may retry after an error and call it again, so
// a handler never treats the first one as final.
export default function TurnstileWidget({
  instance,
  action,
  hint,
  onError,
  onInteractive,
  ...props
}: Props) {
  const widget = useRef<TurnstileInstance>(undefined);
  const [interactive, setInteractive] = useState(false);
  // The forms keep the hint's line, so it appearing moves nothing; the panels,
  // which run the check on demand, keep it out of the layout until it shows.
  const reserve = props.options?.execution !== 'execute';

  // Every error callback, so every surface records its code (the panels'
  // hook adds only its own timeouts). An error ends the checkbox it came from.
  function report(code: string) {
    if (interactive) interact(false);
    console.warn('turnstile: challenge error', { code });
    track('challenge_error', {
      challenge: action,
      code: parseChallengeCode(code),
    });
    onError(code);
  }

  function interact(active: boolean) {
    setInteractive(active);
    onInteractive?.(active);
  }

  // Every reset clears the hint too, so it never outlives its checkbox.
  useImperativeHandle(
    instance,
    () => ({
      render: () => widget.current?.render(),
      execute: () => widget.current?.execute(),
      reset: () => {
        setInteractive(false);
        widget.current?.reset();
      },
      remove: () => widget.current?.remove(),
      getResponse: () => widget.current?.getResponse(),
      getResponsePromise: (timeout?: number, retry?: number) =>
        widget.current
          ? widget.current.getResponsePromise(timeout, retry)
          : Promise.reject(new Error('no widget')),
      isExpired: () => widget.current?.isExpired() ?? false,
    }),
    [],
  );

  return (
    <>
      <Turnstile
        ref={widget}
        {...props}
        onSuccess={(token) => {
          setInteractive(false);
          props.onSuccess?.(token);
        }}
        onError={report}
        onUnsupported={() => report('unsupported')}
        onTimeout={() => interact(true)}
        onBeforeInteractive={() => interact(true)}
        onAfterInteractive={() => interact(false)}
      />
      {hint === null ? null : (
        <p
          aria-live="polite"
          className={`text-ui-s text-fg-soft ${reserve ? 'min-h-[1lh]' : 'empty:sr-only'}`}
        >
          {interactive ? hint : null}
        </p>
      )}
    </>
  );
}
