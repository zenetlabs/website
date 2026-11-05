import type { ReactNode, Ref } from 'react';
import { SECONDARY_BUTTON } from '@/components/ui';
import type { BookingPendingCopy } from '@/content/types';

export type ResendStatus = 'idle' | 'sending' | 'resent' | 'cooldown';

// What the visitor sees once a request is held and its confirm link is on its
// way: the booking page, the chat card and the WebMCP dialog share it. The
// caller owns the wrapper and passes the challenge widget and any alert.
export function BookingPending({
  headingRef,
  headingId,
  headingClass,
  copy,
  label,
  email,
  resend,
  canResend,
  onResend,
  children,
}: {
  headingRef: Ref<HTMLHeadingElement>;
  headingId?: string;
  headingClass: string;
  copy: BookingPendingCopy;
  label: string;
  email: string;
  resend: ResendStatus;
  canResend: boolean;
  onResend: () => void;
  children?: ReactNode;
}) {
  const note =
    resend === 'resent'
      ? copy.resent
      : resend === 'cooldown'
        ? copy.cooldown
        : '';
  return (
    <>
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className={`${headingClass} outline-hidden`}
      >
        {copy.title}
      </h2>
      <p className="font-medium">
        {copy.text.replace('{label}', label).replace('{email}', email)}
      </p>
      <p className="text-fg-soft">{copy.spam}</p>
      {children}
      <div>
        <button
          type="button"
          onClick={onResend}
          disabled={!canResend || resend === 'sending'}
          className={SECONDARY_BUTTON}
        >
          {resend === 'sending' ? copy.resending : copy.resend}
        </button>
      </div>
      <p role="status" className="text-ui-s text-fg-soft">
        {note}
      </p>
      <p className="text-ui-s text-muted-fg">{copy.wrongAddress}</p>
    </>
  );
}
