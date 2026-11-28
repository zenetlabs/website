import { slotsCopy } from '@/content/en/slots';
import type { ContactPageContent } from '@/content/types';

export const contactPage = {
  meta: {
    title: 'Contact',
    metaTitle: 'Contact Zenet Labs: book an automation diagnostic',
    description:
      'Tell us which tools you use and what your team still does by hand. We reply and agree the next step, starting with a fixed-price diagnostic.',
  },
  title: { before: 'Talk ', emphasis: 'to us', after: '' },
  lead: "Pick how you'd like to reach us, and we'll reply within a working day.",
  doors: {
    book: { title: 'Book a call', text: 'Pick a time that suits you.' },
    message: {
      title: 'Send a message',
      text: 'A person on our team replies.',
    },
    ai: {
      title: 'Talk to the AI',
      text: "Ask now. It's an AI, not a person.",
    },
  },
  slots: slotsCopy,
  form: {
    title: { before: '', emphasis: 'Write to us', after: '' },
    lead: 'Mention the tools you use, too.',
    mail: 'Prefer email? Write to',
    voice: {
      text: 'Prefer to talk? Our voice assistant is an AI, not a person: it can answer questions and book a call.',
      button: 'Talk to the assistant',
    },
  },
  next: {
    title: { before: 'What happens ', emphasis: 'next', after: '' },
    steps: [
      {
        id: 'reply',
        label: 'We reply',
        text: 'We reply and agree the scope on a short call.',
      },
      {
        id: 'diagnostic',
        label: 'The diagnostic',
        text: 'In one to two weeks we map your tools and manual work and hand you a costed plan.',
      },
      {
        id: 'decide',
        label: 'You decide',
        text: 'If you go ahead within 60 days, the diagnostic fee is credited to the project.',
      },
    ],
  },
} satisfies ContactPageContent;
