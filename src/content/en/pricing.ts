import type { PricingPageContent } from '@/content/types';

export const pricingPage = {
  meta: {
    title: 'Pricing',
    metaTitle: 'Pricing for automation and AI agents | Zenet Labs',
    description:
      'Published prices in SGD, excluding GST: diagnostic, integrations, AI agents in production, custom web, team training, maintenance and growth.',
  },
  catalog: 'Zenet Labs services and prices',
  eyebrow: 'Pricing',
  title: { before: 'Clear prices, ', emphasis: 'before', after: ' we start' },
  lead: 'Every project starts with a fixed-price diagnostic, so the next quote comes from your real processes, not a guess.',
  taxNote: 'All prices are in Singapore dollars (S$) and exclude GST.',
  labels: {
    price: 'Price',
    includes: 'Includes',
    timeline: 'Timeline',
    more: 'More about',
  },
  // TODO(albert): confirm every list
  details: {
    diagnostic: {
      includes: [
        'Interviews with the people who do the work',
        'A map of your tools and how data moves between them',
        'Hours spent by hand, process by process',
        'A prioritised plan with a price and timeline for each phase',
      ],
      timeline: '1–2 weeks',
    },
    integration: {
      includes: [
        'Scope taken from the diagnostic',
        'Built on your accounts, so you own it',
        'Alerts and retries when something fails',
        'Documentation and handover to your team',
      ],
    },
    agent: {
      includes: [
        'A test set built from your real cases',
        'Approval steps wherever an action has consequences',
        'Usage and cost limits',
        'Monitoring and a log of every action',
      ],
    },
    web: {
      includes: [
        'Design and build around your processes',
        'Fast, accessible and search-friendly',
        'Connected to your tools from day one',
        'Hosting set up on your accounts',
      ],
    },
    training: {
      includes: [
        'Workshops built on your own processes, not generic examples',
        'Mentoring: regular reviews of what the team builds',
        'A usage policy your team can follow',
      ],
    },
    maintenance: {
      includes: [
        'Monitoring and error alerts',
        'Fixes, and updates when your tools change',
        'A monthly review of what to improve',
      ],
    },
    growth: {
      includes: [
        'Technical SEO and a content plan',
        'Pages and articles that answer real customer questions',
        'Conversion fixes based on what visitors do',
      ],
    },
  },
  how: {
    title: 'How pricing works',
    items: [
      'The diagnostic has a fixed price. If you go ahead within 60 days, its fee is credited to the project.',
      'Starting prices and ranges depend on how many tools, how much volume and how much AI is involved. After the diagnostic you get a fixed quote for each phase.',
      // TODO(albert): confirm
      'Maintenance is monthly and optional; you choose a plan once the project is live.',
      // TODO(albert): confirm
      'The code, accounts and data we set up for you are yours.',
    ],
  },
  cta: {
    title: 'Start with the diagnostic',
    text: 'Tell us what your team does by hand and we will reply personally.',
    button: 'Book a diagnostic',
    faq: 'Read the FAQ',
  },
} satisfies PricingPageContent;
