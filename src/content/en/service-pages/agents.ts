// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.agent.prices;
const price = formatPrice('en', row);
const diagnostic = formatPriceSummary('en', services.diagnostic.prices);
const maintenance = formatPriceSummary('en', services.maintenance.prices);

export const agents = {
  meta: {
    metaTitle: 'AI agent development for SMEs in Singapore | Zenet Labs',
    description:
      'We build AI agents that do real work for SMEs: triaging enquiries, drafting replies and reading documents, with a person approving what matters.',
  },
  hero: {
    eyebrow: 'Services · AI agents',
    title: {
      before: 'AI agents for SMEs that do ',
      emphasis: 'real work',
      after: ', with a person in charge',
    },
    // TODO(albert): confirm the timeline
    lead: `An AI agent is software that takes a task from start to finish: it reads an enquiry or a document, looks up what it needs in your systems, decides the next step and does it, within limits you set. We build agents for Singapore companies of 10 to 100 people, for work such as triaging enquiries, drafting replies and processing documents, and a person approves anything with consequences. An agent in production costs ${price}, excluding GST, and a pilot is usually working on real cases six to ten weeks after the diagnostic.`,
  },
  facts: {
    who: 'Companies with a steady flow of enquiries, documents or requests that follow patterns but still need judgement',
    // TODO(albert): confirm the timeline
    timeline:
      '6–10 weeks to a pilot on real cases; production follows once it passes your tests',
    start: `The automation diagnostic (${diagnostic}), credited to the project if you go ahead within 60 days`,
  },
  cta: {
    title: 'Pick the first job for an agent',
    text: 'Tell us which task piles up every day. In the diagnostic we check whether an agent can do it reliably and what it would cost to build and run.',
    button: 'Book a diagnostic',
  },
  useCases: {
    eyebrow: 'What agents do',
    title: {
      before: 'Tasks an agent ',
      emphasis: 'can own',
      after: '',
    },
    items: [
      {
        id: 'triage',
        title: 'Enquiry triage',
        text: 'Reads every email, form and WhatsApp message, works out what is being asked, and routes it with a summary to the right person, or answers it if the answer is routine.',
      },
      {
        id: 'drafting',
        title: 'Replies and proposals',
        text: 'Drafts replies and quotes in your tone from your catalogue, prices and past answers, for someone on your team to check and send.',
      },
      {
        id: 'documents',
        title: 'Document processing',
        text: 'Reads invoices, contracts, delivery notes or application forms, extracts what matters and checks it against your records.',
      },
      {
        id: 'knowledge',
        title: 'Internal questions',
        text: "Answers your team's questions about policies, products or past cases from your own documents, with a link to the source.",
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: {
      before: 'Tested on ',
      emphasis: 'your cases',
      after: ' before it goes live',
    },
    steps: [
      {
        id: 'scope',
        label: 'Define the job',
        text: 'We agree what the agent may do on its own, what it must ask about, and what it must never do.',
      },
      {
        id: 'tests',
        label: 'Build the test set',
        text: 'We collect real past cases with the right answers, so every version of the agent is measured before anyone relies on it.',
      },
      {
        id: 'pilot',
        label: 'Pilot with approval',
        text: 'The agent works on live cases while a person approves each action. We tune it until the approval rate shows it is ready.',
      },
      {
        id: 'production',
        label: 'Run in production',
        text: 'Routine actions go through on their own; anything with consequences still waits for a person. Usage, cost and errors are monitored, and every action is logged.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    page: 'viatsyCase',
    eyebrow: 'Case',
    title: { before: 'First replies at ', emphasis: 'Viatsy', after: '' },
    text: 'Viatsy receives travel enquiries on several channels, and each one needs a tailored answer. An agent drafts the first reply and the proposal, and the team reviews them before anything is sent.',
    points: [
      'A drafted first reply to every enquiry, which a person reviews and sends',
      "Proposals drafted from the client's brief and the trip catalogue",
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: { before: 'Questions about ', emphasis: 'AI agents', after: '' },
    items: [
      {
        id: 'agents-vs-chatbot',
        question: 'How is an AI agent different from a chatbot?',
        answer:
          'A chatbot answers questions in a chat window. An agent does work in your systems: it reads the enquiry, checks stock or a booking, drafts the reply or updates the record, and hands over to a person when it should. Many agents never talk to customers directly at all.',
      },
      {
        // TODO(albert): confirm the data-access promises
        id: 'agents-data-access',
        question: 'Does the agent see all of our data?',
        answer:
          'Only what its job needs. It gets its own access with the narrowest permissions that work, read-only wherever possible, and it never sees passwords or card details. Every lookup and action is logged, so you can check what it saw and why it acted.',
      },
      {
        id: 'agents-ready',
        question: 'How do we know an agent is ready for production?',
        answer:
          'From the numbers, not a demo. Before launch it has to pass the test set built from your real cases, and during the pilot we track how often a person changes or rejects what it proposes. You set the threshold, and it goes live only when it meets it.',
      },
      {
        id: 'agents-running-costs',
        question: 'What are the running costs once an agent is live?',
        answer: `Two parts: the AI provider's usage, which depends on volume, and, if you want us to monitor and tune the agent, a maintenance plan (${maintenance}). We estimate usage in the diagnostic and set a monthly spending cap, so the bill holds no surprises.`,
      },
    ],
  },
  related: ['automation', 'training'],
} satisfies ServicePageContent;
