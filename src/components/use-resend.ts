import { useState } from 'react';
import type { ResendStatus } from '@/components/booking-pending';
import {
  type BookingOutcome,
  type BookingRequest,
  submitBooking,
} from '@/lib/booking-client';

type Failed = Exclude<BookingOutcome, { kind: 'pending' }>;

// "Send the email again" on a held request: the same details with a fresh
// Turnstile token. The server decides whether a new email goes out (resent) or
// the last one is too recent (cooldown); a failure is handed back to the caller.
export function useResend(challenge: { token: string; retry: () => void }) {
  const [status, setStatus] = useState<ResendStatus>('idle');
  async function resend(request: BookingRequest): Promise<Failed | null> {
    setStatus('sending');
    const outcome = await submitBooking({
      ...request,
      turnstileToken: challenge.token,
    });
    challenge.retry();
    if (outcome.kind === 'pending') {
      setStatus(outcome.resent ? 'resent' : 'cooldown');
      return null;
    }
    setStatus('idle');
    return outcome;
  }
  return { status, resend };
}
