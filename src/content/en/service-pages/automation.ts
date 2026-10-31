// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('en', row);
const diagnostic = formatPriceSummary('en', services.diagnostic.prices);

export const automation = {
  meta: {
    metaTitle: 'AI automation services for Singapore SMEs | Zenet Labs',
    description:
      'We automate the manual steps in your processes, from documents and approvals to reminders and reports, using AI where it helps. For Singapore SMEs.',
  },
  hero: {
    eyebrow: 'Services · AI automation',
    title: {
      before: 'AI automation for the work your team ',
      emphasis: 'still does by hand',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `AI automation is software that runs the repetitive steps of a business process for you: it reads incoming documents, moves data between your tools and sends the routine messages, and it asks a person when something looks wrong. We build it for Singapore companies of 10 to 100 people, on the tools they already use. Projects cost ${price}, excluding GST, and the first automation usually goes live four to eight weeks after the diagnostic.`,
  },
  facts: {
    who: 'Companies of 10 to 100 people that copy data by hand between an accounting system, a shop, a CRM, email and spreadsheets',
    // TODO(albert): confirm the timeline
    timeline:
      '4–8 weeks to the first automation in production, after a 1–2 week diagnostic',
    start: `The automation diagnostic (${diagnostic}), credited to the project if you go ahead within 60 days`,
  },
  cta: {
    title: 'Find out what you can automate',
    text: 'Tell us which process eats the most hours. The diagnostic maps it, costs it and tells you honestly whether automation pays off.',
    button: 'Book a diagnostic',
  },
  useCases: {
    eyebrow: 'What we automate',
    title: {
      before: 'Processes that ',
      emphasis: 'run on their own',
      after: ' once they are set up',
    },
    items: [
      {
        id: 'documents',
        title: 'Documents to data',
        text: 'Supplier invoices, purchase orders and forms are read by AI, checked against what you expected and filed. Only the exceptions reach a person.',
      },
      {
        id: 'approvals',
        title: 'Approvals',
        text: 'Purchase requests, discounts and refunds follow one route: the right person approves from email or chat, and the decision is recorded where it belongs.',
      },
      {
        id: 'follow-ups',
        title: 'Follow-ups and reminders',
        text: 'Quotes, payment reminders and renewal notices go out on schedule, by email or WhatsApp, and stop as soon as the customer replies or pays.',
      },
      {
        id: 'reports',
        title: 'Reports',
        text: "The weekly sales, cash or operations report is assembled from your systems and lands in your inbox, instead of taking up someone's Monday morning.",
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: { before: 'From one process to ', emphasis: 'many', after: '' },
    steps: [
      {
        id: 'map',
        label: 'Map',
        text: 'In the diagnostic we follow the process with the people who do it, count the hours and pick the steps worth automating first.',
      },
      {
        id: 'build',
        label: 'Build',
        text: 'We build the first automation on your accounts, with alerts and retries for when a tool is down or the data looks wrong.',
      },
      {
        id: 'run',
        label: 'Run alongside',
        text: 'It runs next to your team for a few weeks. We compare the results and fix what the real data reveals.',
      },
      {
        id: 'extend',
        label: 'Extend',
        text: 'Once it holds up, we move to the next process, and you can choose a maintenance plan to keep it working.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    page: 'viatsyCase',
    eyebrow: 'Case',
    title: {
      before: 'How ',
      emphasis: 'Viatsy',
      after: ' handles supplier confirmations',
    },
    text: "Viatsy runs small-group trips to Asia, and every trip depends on many supplier bookings. Each confirmation used to be copied into the booking by hand; now it flows in on its own and a person checks only what doesn't match.",
    points: [
      'Supplier confirmations read and added to the booking',
      "The client's travel pack assembled from those confirmations",
      'Payment requests and reminders sent on schedule',
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: {
      before: 'Questions about ',
      emphasis: 'AI automation',
      after: '',
    },
    items: [
      {
        id: 'automation-first-processes',
        question: 'Which processes are worth automating first?',
        answer:
          'The ones that happen often, follow the same steps most of the time and cost hours every week: entering orders or invoices, chasing payments, preparing reports. Rare or judgement-heavy work is usually better left to people. The diagnostic ranks your processes by the hours they would save against the cost to build.',
      },
      {
        // TODO(albert): confirm Zapier, Make and n8n
        id: 'automation-no-code-tools',
        question: "Can't we do this ourselves with Zapier or Make?",
        answer:
          'Often, yes, for simple two-step flows, and we will tell you when that is enough. We step in when a process spans several tools, needs AI to read documents or messages, or has to handle errors and exceptions reliably. Where it fits, we build on Zapier, Make or n8n so your team can keep editing it.',
      },
      {
        id: 'automation-where-ai',
        question: "Where does AI come in, and where doesn't it?",
        answer:
          'AI handles the steps that need reading or judgement, such as pulling the fields out of a PDF invoice or deciding which team an email belongs to. Fixed rules handle everything else, because they are cheaper and predictable. Each AI step has a confidence check, and anything uncertain goes to a person.',
      },
      {
        id: 'automation-jobs',
        question: 'Will this replace people on our team?',
        answer:
          'It replaces tasks, not roles. The hours usually go back into work that needs a person: customers, suppliers, exceptions. We design each automation with the people who do the work today, and they decide when it is ready to take over.',
      },
    ],
  },
  related: ['integrations', 'agents'],
} satisfies ServicePageContent;
