import type { Services } from '@/content/types';

export const services = {
  diagnostic: {
    id: 'diagnostic',
    name: 'Automation diagnostic',
    summary:
      'One to two weeks mapping your tools and manual work, ending in a costed plan. Credited to the project if you continue within 60 days.',
    prices: [{ id: 'diagnostic', min: 3000, unit: 'one-off', currency: 'SGD' }],
  },
  integration: {
    id: 'integration',
    name: 'Integration or automation',
    summary:
      'Connect two or more tools so data moves on its own: shop to ERP, CRM to invoicing, forms to spreadsheets.',
    prices: [
      {
        id: 'integration',
        min: 8000,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'SGD',
      },
    ],
  },
  agent: {
    id: 'agent',
    name: 'AI agent in production',
    summary:
      'An agent that does a real task end to end, such as triage, replies or reading documents, with a person approving what matters.',
    prices: [
      {
        id: 'agent',
        min: 15000,
        max: 35000,
        unit: 'one-off',
        currency: 'SGD',
      },
    ],
  },
  web: {
    id: 'web',
    name: 'Custom web or app',
    summary:
      'A website, customer portal or internal tool built around how you work.',
    prices: [
      {
        id: 'web',
        min: 12000,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'SGD',
      },
    ],
  },
  training: {
    id: 'training',
    name: 'AI training and mentoring for teams',
    summary:
      'Hands-on workshops on your own processes, and monthly mentoring while the team adopts AI.',
    prices: [
      {
        id: 'training-workshop',
        label: 'Workshop',
        min: 2500,
        qualifier: 'from',
        unit: 'one-off',
        currency: 'SGD',
      },
      {
        id: 'training-mentoring',
        label: 'Mentoring',
        min: 1200,
        unit: 'month',
        currency: 'SGD',
      },
    ],
  },
  // TODO(albert): tier names and scope
  maintenance: {
    id: 'maintenance',
    name: 'Maintenance and operation',
    summary:
      'Monitoring, fixes, updates and monthly improvements for what we built.',
    prices: [
      {
        id: 'maintenance-essential',
        label: 'Essential',
        note: 'One integration or automation: monitoring and fixes.',
        min: 500,
        unit: 'month',
        currency: 'SGD',
      },
      {
        id: 'maintenance-standard',
        label: 'Standard',
        note: 'Several automations, plus monthly improvements.',
        min: 1200,
        unit: 'month',
        currency: 'SGD',
      },
      {
        id: 'maintenance-extended',
        label: 'Extended',
        note: 'AI agents in production: evaluation, tuning and cost control.',
        min: 2500,
        unit: 'month',
        currency: 'SGD',
      },
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth: SEO, content and conversion',
    summary:
      'Monthly work on search, content and conversion so the right customers find you and get in touch.',
    prices: [
      {
        id: 'growth',
        min: 1500,
        qualifier: 'from',
        unit: 'month',
        currency: 'SGD',
      },
    ],
  },
} satisfies Services;
