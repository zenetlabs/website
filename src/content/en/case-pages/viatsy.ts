// TODO(albert): confirm every claim; the figures live in cases.ts as [X]
import type { CasePageContent } from '@/content/types';

export const viatsyCase = {
  meta: {
    metaTitle: 'How AI agents run Viatsy, a travel company | Zenet Labs',
    description:
      'How Viatsy, our own small-group travel company, runs enquiries, proposals, supplier bookings and payments with AI agents and a person approving each step.',
  },
  eyebrow: 'Case study · Travel',
  title: {
    before: 'Viatsy, a travel company ',
    emphasis: 'run with AI agents',
    after: '',
  },
  lead: 'Viatsy is a travel company we own and run. It organises small-group trips to Japan, China, Korea, Taiwan and Hong Kong, and every trip involves enquiries on several channels, a tailored proposal and many supplier bookings. We built the systems that let a small team handle that work: AI agents prepare replies, proposals, booking records and payment reminders, and a person approves every step that reaches a customer.',
  published: '2026-10-31',
  labels: { published: 'Published', updated: 'Updated' },
  facts: [
    {
      id: 'company',
      label: 'Company',
      value: 'Viatsy, small-group trips to Asia (our own company)',
    },
    {
      id: 'built',
      label: 'What we built',
      value:
        'Agents and automations for enquiries, proposals, bookings, payments and travel documents',
    },
    {
      id: 'services',
      label: 'Services',
      value: 'AI agents, automation and integrations',
    },
    {
      id: 'approach',
      label: 'How it runs',
      value:
        'Agents prepare the work; a person approves anything a customer sees',
    },
  ],
  problem: {
    eyebrow: 'The problem',
    title: {
      before: 'A small team, ',
      emphasis: 'a lot of copying',
      after: '',
    },
    paragraphs: [
      "A group trip to Asia is many small jobs. Enquiries arrive on WhatsApp, email and the website, and each needs a tailored answer. A proposal combines flights, hotels, trains, activities and insurance. Once a trip is booked, every supplier sends a confirmation in its own format, and each one has to reach the booking, the payment plan and the customer's travel documents.",
      'Done by hand, that work grows with every booking, and the mistakes are the kind customers notice: a misspelt name, a missing voucher, a reminder that never went out.',
    ],
  },
  built: {
    eyebrow: 'What we built',
    title: { before: 'One system for ', emphasis: 'every booking', after: '' },
    items: [
      {
        id: 'inbox',
        title: 'One inbox for every channel',
        text: 'WhatsApp, email and website enquiries land in the same place, linked to the customer and the trip they ask about.',
      },
      {
        id: 'replies',
        title: 'Drafted replies',
        text: 'An agent drafts each reply from the trip details and the house rules the team has written, and a person edits and sends it. What the team changes is recorded, so the drafts improve.',
      },
      {
        id: 'proposals',
        title: 'Proposals from the brief',
        text: 'Proposals are drafted from what the customer asked for and the trip catalogue, with prices calculated by fixed rules rather than by the model.',
      },
      {
        id: 'confirmations',
        title: 'Supplier confirmations, read in',
        text: 'Confirmations pasted as text or forwarded by email become structured reservations on the booking, and gaps or mismatches are flagged.',
      },
      {
        id: 'payments',
        title: 'Payments on schedule',
        text: "Deposit and balance requests, and their reminders, follow each booking's payment plan.",
      },
      {
        id: 'pack',
        title: 'Travel documents assembled',
        text: "The customer's travel pack is built from the booking itself, with a check that lists anything still missing before it is sent.",
      },
    ],
  },
  operations: {
    eyebrow: 'Day to day',
    title: { before: 'How the agents ', emphasis: 'run operations', after: '' },
    steps: [
      {
        id: 'enquiry',
        label: 'Enquiry',
        text: 'A message arrives. The agent identifies the customer and the trip and drafts a reply; a person reviews it and sends it.',
      },
      {
        id: 'proposal',
        label: 'Proposal',
        text: "From the customer's brief, the agent drafts an itinerary, and the price comes from the pricing rules. The team adjusts it and sends it.",
      },
      {
        id: 'booking',
        label: 'Booking',
        text: "When the customer accepts, the supplier bookings are made and each confirmation is read into the booking. The system flags what doesn't match.",
      },
      {
        id: 'trip',
        label: 'Before and during the trip',
        text: 'Payment reminders and pre-departure messages go out on schedule, and the travel pack is checked and sent. Replies from the customer land on their booking.',
      },
    ],
  },
  results: {
    eyebrow: 'Results',
    title: { before: 'What has ', emphasis: 'changed', after: '' },
    points: [
      'Nobody copies supplier confirmations into bookings by hand any more; a person checks only what the system flags.',
      'Every enquiry gets a drafted first reply, so the team starts from an answer instead of a blank page.',
      'Payment requests and reminders no longer depend on someone remembering them.',
      'What we built for Viatsy became Taplany, our software for travel agencies.',
    ],
  },
  cta: {
    title: 'Want the same for your business?',
    text: "Tell us which work still eats your team's hours. The diagnostic maps it, costs it and tells you honestly what is worth automating.",
    button: 'Book a diagnostic',
  },
  related: ['agents', 'automation'],
} satisfies CasePageContent;
