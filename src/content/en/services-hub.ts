import { services } from '@/content/en/services';
import type { ServicesHubContent } from '@/content/types';
import { formatPriceSummary } from '@/lib/money';

const diagnostic = formatPriceSummary('en', services.diagnostic.prices);

export const servicesHub = {
  meta: {
    title: 'Services',
    metaTitle: 'AI consulting and automation services | Zenet Labs',
    description:
      'From a fixed-price diagnostic to automations, integrations, AI agents, custom software and team training: every Zenet Labs service, with its price.',
  },
  eyebrow: 'Services',
  title: {
    before: 'AI consulting that ends in ',
    emphasis: 'working systems',
    after: '',
  },
  // TODO(albert): review the "small AI consultancy" claim
  lead: "Zenet Labs is a small AI consultancy for Singapore companies of 10 to 100 people. We don't stop at advice: we connect your tools, automate the manual work, put AI agents into production and train your team, with published prices and a fixed-price diagnostic to start.",
  cards: {
    automation: {
      name: 'AI automation',
      summary:
        'Software that runs the repetitive steps of your processes, from documents and approvals to reminders and reports.',
    },
    integrations: {
      name: 'Integrations',
      summary:
        'Xero, Shopify, HubSpot and WhatsApp connected, so orders, invoices and customers move between them on their own.',
    },
    agents: {
      name: 'AI agents',
      summary:
        'Agents that triage enquiries, draft replies and process documents, with a person approving what matters.',
    },
    software: {
      name: 'Custom software',
      summary:
        'Customer portals, internal tools and web apps built around how you work.',
    },
    training: {
      name: 'AI training for teams',
      summary:
        'Hands-on workshops on your own processes, and monthly mentoring while the team adopts AI.',
    },
  },
  also: {
    title: 'Diagnostic, maintenance and growth',
    lead: 'Every project starts with the diagnostic. Once it is live, maintenance keeps it working, and growth work helps the right customers find you.',
  },
  start: {
    title: 'Not sure which service you need?',
    text: `Start with the automation diagnostic. In one to two weeks we map your tools and manual work and hand you a costed plan. It costs ${diagnostic}, excluding GST, and is credited to the project if you continue within 60 days.`,
    button: 'Book a diagnostic',
  },
  pricing: 'See all prices',
} satisfies ServicesHubContent;
