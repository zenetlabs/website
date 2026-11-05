import type { BookingPendingCopy } from '@/content/types';

export const bookingPending = {
  title: 'Check your inbox',
  text: "We're keeping {label} for you for 30 minutes and have sent a link to {email}. Open it and press Confirm to book the call.",
  spam: 'Nothing yet? It can take a minute; check your spam folder.',
  resend: 'Send the email again',
  resending: 'Sending…',
  resent: 'Sent again. Only the newest link works.',
  cooldown: 'We sent it less than a minute ago. Check your spam folder.',
  wrongAddress:
    'Wrong address? Choose another time with the right one; this one is released on its own in 30 minutes.',
} satisfies BookingPendingCopy;
