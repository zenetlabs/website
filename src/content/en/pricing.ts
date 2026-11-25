import { serviceIncludes } from '@/content/en/service-includes';
import type { PricingPageContent } from '@/content/types';

export const pricingPage = {
  meta: {
    title: 'Pricing',
    metaTitle: 'Pricing for automation and AI agents | Zenet Labs',
    description:
      'Published prices in SGD, excluding GST: diagnostic, integrations, AI agents in production, custom web, team training, maintenance and growth.',
  },
  catalog: 'Zenet Labs services and prices',
  title: { before: 'Clear prices, ', emphasis: 'before', after: ' we start' },
  lead: 'Every project starts with a fixed-price diagnostic, so the next quote comes from your real processes, not a guess.',
  taxNote: 'All prices are in Singapore dollars (S$) and exclude GST.',
  labels: {
    price: 'Price',
    includes: 'Includes',
    timeline: 'Timeline',
    more: 'More about',
    startHere: 'Start here',
    book: 'Book the diagnostic',
  },
  // TODO(albert): confirm every list (in service-includes.ts)
  details: {
    diagnostic: {
      includes: serviceIncludes.diagnostic,
      timeline: '1–2 weeks',
    },
    integration: {
      includes: serviceIncludes.integration,
    },
    agent: {
      includes: serviceIncludes.agent,
    },
    web: {
      includes: serviceIncludes.web,
    },
    training: {
      includes: serviceIncludes.training,
    },
    maintenance: {
      includes: serviceIncludes.maintenance,
    },
    growth: {
      includes: serviceIncludes.growth,
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
  calculator: {
    title: 'Not sure which line fits?',
    text: 'Answer six questions and see an indicative range for your project, without leaving your email.',
    link: 'Open the price calculator',
  },
  faq: {
    title: {
      before: 'Questions about ',
      emphasis: 'time, cost and ownership',
      after: '',
    },
  },
  cta: {
    title: 'Start with the diagnostic',
    text: 'Tell us what your team does by hand and we will reply.',
    button: 'Book a call',
  },
} satisfies PricingPageContent;
