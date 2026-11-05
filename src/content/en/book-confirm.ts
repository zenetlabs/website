import type { BookingConfirmCopy } from '@/content/types';

// The page behind the emailed link; loaded only when the URL carries ?confirm.
export const bookConfirm = {
  slot: '{label} ({zone}) · 30 minutes on Google Meet',
  for: 'For {masked}',
  button: 'Confirm the call',
  notYou:
    "Didn't ask for this? Close this page. The time is released in 30 minutes and nothing else happens.",
  pick: 'See available times',
  states: {
    pending: { title: 'Confirm your call', text: '' },
    confirming: {
      title: "We're creating your invitation",
      text: "It takes a few seconds. Reload the page if it doesn't update.",
    },
    confirmed: {
      title: 'Your call is booked',
      text: '{label} ({zone}). The Google Calendar invitation with the Meet link is on its way to {masked}.',
    },
    expired: {
      title: 'This link has expired',
      text: 'We kept the time for 30 minutes and then released it. Pick a new time.',
    },
    taken: {
      title: 'That time is no longer free',
      text: 'Something came up in our calendar before you confirmed. Pick another time.',
    },
    failed: {
      title: "We couldn't create the invitation",
      text: 'Nothing was booked. Pick a time again, or write to hello@zenetlabs.com.',
    },
    unknown: {
      title: "We're checking your booking",
      text: "Our calendar didn't answer in time. We'll email you within one working day; you don't need to do anything.",
    },
    unavailable: {
      title: "Our calendar isn't answering",
      text: 'Nothing changed. Try the button again in a few minutes; the link works until {time}.',
    },
    cancelled: {
      title: 'This call was cancelled',
      text: 'Pick another time, or reply to our email.',
    },
    invalid: {
      title: "This link doesn't work",
      text: 'It may be incomplete, or a newer email replaced it. Use the link in the latest email, or pick a time again.',
    },
  },
} satisfies BookingConfirmCopy;
