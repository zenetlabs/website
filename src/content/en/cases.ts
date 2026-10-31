import { viatsyCaseName } from '@/content/en/case-name';
import type { CaseStudy } from '@/content/types';

export const viatsy = {
  id: 'viatsy',
  name: 'Viatsy',
  tag: 'Travel · Small-group tours to Asia',
  context:
    'Viatsy runs small-group trips to Japan, China, Korea, Taiwan and Hong Kong. Every trip means inquiries on several channels, a tailored proposal and many supplier bookings.',
  // TODO(albert): confirm
  automated: [
    'A drafted first reply to every inquiry, which a person reviews and sends',
    "Proposals drafted from the client's brief and the trip catalogue",
    "Supplier confirmations read into the booking, and the client's travel pack assembled from them",
    'Payment requests and reminders sent on schedule',
  ],
  metrics: [
    // TODO(albert): [X]
    {
      id: 'admin-hours',
      label: 'Hours of admin saved per week',
      value: null,
      unit: ' h',
    },
    // TODO(albert): [X]
    {
      id: 'first-reply',
      label: 'Time to first reply',
      value: null,
      unit: ' min',
    },
  ],
  link: { page: 'viatsyCase', label: viatsyCaseName },
} satisfies CaseStudy;

export const taplany = {
  id: 'taplany',
  name: 'Taplany',
  tag: 'SaaS · Software for travel agencies',
  context:
    "Taplany is the platform we built from Viatsy's automations so other travel agencies can use them: website, inquiries, proposals, bookings, payments and WhatsApp in one place.",
  // TODO(albert): confirm
  automated: [
    "Replies to inquiries drafted in the agency's tone, for a person to approve",
    'Itineraries and supplier confirmations pasted as text turned into structured bookings',
    'WhatsApp, email and payment links in the same timeline as each booking',
    'Website content drafted and fact-checked before it is published',
  ],
  metrics: [
    // TODO(albert): [X]
    {
      id: 'agencies',
      label: 'Travel agencies using it',
      value: null,
      unit: '',
    },
    // TODO(albert): [X]
    {
      id: 'proposals',
      label: 'Proposals created per month',
      value: null,
      unit: '',
    },
  ],
} satisfies CaseStudy;

export const cases = [viatsy, taplany] satisfies readonly CaseStudy[];
