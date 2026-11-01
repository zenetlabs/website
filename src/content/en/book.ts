import type { BookPageContent } from '@/content/types';

// TODO(albert): review the copy, including "free, no commitment" and the call being the step before the paid diagnostic
export const bookPage = {
  meta: {
    title: 'Book a call',
    metaTitle: 'Book a 30-minute call | Zenet Labs',
    description:
      'Pick a time for a free 30-minute video call with Zenet Labs about the manual work in your company. No account needed.',
  },
  breadcrumb: { label: 'Breadcrumb' },
  eyebrow: 'Book a call',
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
    zones: {
      'Pacific/Honolulu': 'Honolulu',
      'America/Los_Angeles': 'Los Angeles',
      'America/Denver': 'Denver',
      'America/Mexico_City': 'Mexico City',
      'America/Chicago': 'Chicago',
      'America/New_York': 'New York',
      'America/Bogota': 'Bogotá',
      'America/Sao_Paulo': 'São Paulo',
      'America/Argentina/Buenos_Aires': 'Buenos Aires',
      UTC: 'UTC',
      'Europe/London': 'London',
      'Europe/Madrid': 'Madrid',
      'Europe/Berlin': 'Berlin',
      'Europe/Athens': 'Athens',
      'Europe/Moscow': 'Moscow',
      'Africa/Lagos': 'Lagos',
      'Africa/Johannesburg': 'Johannesburg',
      'Asia/Dubai': 'Dubai',
      'Asia/Kolkata': 'Mumbai and Delhi',
      'Asia/Bangkok': 'Bangkok',
      'Asia/Singapore': 'Singapore',
      'Asia/Hong_Kong': 'Hong Kong',
      'Asia/Tokyo': 'Tokyo',
      'Australia/Perth': 'Perth',
      'Australia/Sydney': 'Sydney',
      'Pacific/Auckland': 'Auckland',
    },
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
    email: 'Email (the invitation goes here)',
    company: 'Company (optional)',
    topic: 'What would you like to talk about?',
    consent:
      'I agree that {legalName} uses these details to book this call, including a Google Calendar event with my email address, as described in the {privacyLink}.',
    consentLink: 'privacy policy',
    honeypot: 'Leave this field empty',
    submit: 'Book this time',
    sending: 'Booking…',
    noscript:
      'Booking needs JavaScript. Email us the time that suits you at {email}.',
  },
  success: {
    title: "You're booked",
    when: 'Your call is on {time} ({zone}).',
    text: 'We have sent a Google Calendar invitation and a confirmation to {email}.',
    meet: 'Join with Google Meet',
    meetLater:
      'The Google Meet link comes with the calendar invitation. If you do not see it, we will email it before the call.',
  },
  errors: {
    taken:
      'Someone just took that time. The list is up to date now, please pick another.',
    dayFull:
      'That day is now fully booked. The list is up to date, please pick another day.',
    limit:
      'We could not book this time for that address. Please pick another time or write to',
    send: 'We could not confirm the booking. Please try again, or write to',
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
