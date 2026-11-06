import { bookingPending } from '@/content/en/booking-pending';
import { zoneNames } from '@/content/en/zone-names';
import type { BookPageContent } from '@/content/types';

// TODO(albert): review the copy, including "free, no commitment" and the call being the step before the paid diagnostic
export const bookPage = {
  meta: {
    title: 'Book a call',
    metaTitle: 'Book a 30-minute call | Zenet Labs',
    description:
      'Pick a time for a free 30-minute video call with Zenet Labs about the manual work in your company. No account needed; we email you a link to confirm.',
  },
  breadcrumb: { label: 'Breadcrumb' },
  title: {
    before: 'Thirty minutes to find the ',
    emphasis: 'right',
    after: ' first job',
  },
  lead: 'Tell us where your team copies data by hand. We will say honestly whether automating it makes sense, and what the first step would be.',
  facts: [
    { id: 'duration', label: 'Duration', value: '30 minutes' },
    {
      id: 'where',
      label: 'Where',
      value: 'Google Meet. The link is in your calendar invitation.',
    },
    { id: 'cost', label: 'Cost', value: 'Free, no commitment.' },
    {
      id: 'next',
      label: 'Next step',
      value:
        'If it is a fit, we propose the automation diagnostic ({diagnostic}, credited to the project if you continue within 60 days).',
    },
  ],
  zone: {
    label: 'Your time zone',
    show: 'Show times',
    legend: 'Times in {zone}',
    zones: zoneNames,
  },
  picker: {
    legend: 'Pick a time',
    times: { one: '1 time', other: '{n} times' },
    required: 'Pick a time first.',
  },
  form: {
    label: 'Booking form',
    details: 'Your details',
    name: 'Name',
    email: 'Email (the confirmation link goes here)',
    company: 'Company (optional)',
    topic: 'What would you like to talk about?',
    consent:
      'I agree that {legalName} uses these details to book this call, including a Google Calendar event with my email address, as described in the {privacyLink}, which also explains how to exercise my rights over my data.',
    consentLink: 'privacy policy',
    honeypot: 'Leave this field empty',
    submit: 'Request this time',
    sending: 'Sending…',
    noscript:
      'Booking needs JavaScript. Email us the time that suits you at {email}.',
  },
  pending: bookingPending,
  errors: {
    taken:
      'Someone just took that time. The list is up to date now, please pick another.',
    dayFull:
      'That day is now fully booked. The list is up to date, please pick another day.',
    limit:
      "We can't hold another time for this address right now. If you already asked for one, confirm it from the email; otherwise try again later or write to",
    disposable:
      "Please use a permanent email address. We can't book calls for temporary inboxes.",
    send: 'We could not send the request. Please try again, or write to',
    captcha: 'The security check failed. Please try again, or write to',
    rate: 'Too many attempts from your connection. Wait a minute and try again, or write to',
  },
  unavailable: {
    title: "Online booking isn't available right now",
    text: 'Send us a message instead and we will suggest a time.',
  },
  empty: {
    title: 'No free times in the next two weeks',
    text: 'Send us a message and we will find a time that works.',
  },
  contactMail: 'Or write to us at',
  llms: 'Book a free 30-minute call',
} satisfies BookPageContent;
