// TODO(albert): review this page: the steps, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice } from '@/lib/money';

const [price] = services.diagnostic.prices;

export const diagnostic = {
  meta: {
    metaTitle: 'Automation diagnostic at a fixed price | Zenet Labs',
    description:
      'A one to two week automation diagnostic: we map your tools and manual work and hand you a costed plan. Fixed price, credited to the project if you go on.',
  },
  hero: {
    title: {
      before: 'The automation diagnostic: a ',
      emphasis: 'costed plan',
      after: ' in one to two weeks',
    },
    lead: `The automation diagnostic is where every Zenet Labs project starts. In one to two weeks we map your tools and the work your team still does by hand, and hand you a prioritised plan with a price and a timeline for each phase. It costs ${formatPrice('en', price)}, excluding GST, and is credited to the project if you continue within 60 days.`,
  },
  facts: {
    who: 'Companies of 10 to 100 people that run on several tools and lose hours moving data between them',
    timeline: '1–2 weeks',
    start: 'A short call to agree the scope and the processes to look at',
  },
  cta: {
    title: 'Book your diagnostic',
    text: 'Tell us which tools you use and what your team still does by hand. We reply personally and agree the scope on a short call.',
    button: 'Book a diagnostic',
  },
  useCases: {
    title: {
      before: 'What you ',
      emphasis: 'get at the end',
      after: '',
    },
    items: [
      {
        id: 'interviews',
        title: 'Interviews with the people who do the work',
        text: 'The plan comes from the people who run the processes every day, not from a guess made at a desk.',
      },
      {
        id: 'tool-map',
        title: 'A map of your tools',
        text: 'Which tools you use and how data moves between them, so it is clear where it is copied by hand.',
      },
      {
        id: 'hours',
        title: 'Hours spent by hand',
        text: 'How long each process takes today, process by process, which gives the plan a baseline to compare against after go-live.',
      },
      {
        id: 'plan',
        title: 'A prioritised plan',
        text: 'A price and a timeline for each phase, so you can decide what to build first and what to leave.',
      },
    ],
  },
  how: {
    title: {
      before: 'From the first call to ',
      emphasis: 'a costed plan',
      after: '',
    },
    steps: [
      {
        id: 'call',
        label: 'Call',
        text: 'We agree the scope on a short call: which processes and which tools to look at.',
      },
      {
        id: 'map',
        label: 'Map',
        text: 'We talk to the people who do the work and map your tools and how data moves between them.',
      },
      {
        id: 'measure',
        label: 'Measure',
        text: 'We measure how long each process takes today, so the result can be compared with the same numbers later.',
      },
      {
        id: 'plan',
        label: 'Plan',
        text: 'You receive a prioritised plan with a price and timeline for each phase, and decide whether to go ahead.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    title: {
      before: 'We start with ',
      emphasis: 'our own companies',
      after: '',
    },
    text: 'Before we build an automation for a client, we run it in a business we own. At Viatsy, our travel company, agents prepare replies and proposals and a person reviews what reaches a customer.',
    points: [
      'A drafted first reply to every inquiry, which a person reviews and sends',
      "Supplier confirmations read into the booking, and the client's travel pack assembled from them",
    ],
    page: 'viatsyCase',
  },
  faq: {
    title: {
      before: 'Questions about the ',
      emphasis: 'diagnostic',
      after: '',
    },
    items: [
      {
        id: 'diagnostic-know-process',
        question: 'Do we need to know what to automate before we start?',
        answer:
          'No. Finding that out is what the diagnostic is for. We talk to the people who do the work, measure how long each process takes by hand and rank them, so the plan starts where it matters most.',
      },
      {
        id: 'diagnostic-credit',
        question: 'What happens to the fee if we go ahead?',
        answer:
          'If you continue within 60 days, the diagnostic fee is credited to the project. If you decide not to, you have paid a fixed price for a costed plan and nothing more.',
      },
      {
        id: 'diagnostic-not-worth-it',
        question: 'What if automating turns out not to be worth it?',
        answer:
          'We tell you. The plan puts a price and a timeline on each phase next to the hours you spend today, and if an automation would not pay for itself, we say so instead of selling it to you.',
      },
      {
        id: 'diagnostic-after',
        question: 'What happens after the plan?',
        answer:
          'You decide. A first phase is scoped to go live in weeks, not months, and larger agents and custom apps are split into phases, each with its own result. After go-live, maintenance is optional.',
      },
    ],
  },
  related: ['automation', 'agents'],
} satisfies ServicePageContent;
