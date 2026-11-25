import { diagnosticPlan } from '@/content/en/diagnostic-plan';
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
  },
  timelines: { diagnostic: '1–2 weeks' },
  plan: diagnosticPlan,
  how: {
    title: 'How pricing works',
    items: [
      {
        id: 'fixed',
        title: 'Fixed price, credited if you go ahead',
        text: 'The diagnostic has a fixed price. If you go ahead within 60 days, its fee is credited to the project.',
      },
      {
        id: 'quote',
        title: 'A fixed quote before you commit',
        text: 'Starting prices and ranges depend on how many tools, how much volume and how much AI is involved. After the diagnostic you get a fixed quote for each phase.',
      },
      {
        id: 'care',
        title: 'Care only if you want it',
        // TODO(albert): confirm
        text: 'Maintenance is monthly and optional; you choose a plan once the project is live.',
      },
      {
        id: 'owner',
        title: 'Your code, accounts and data',
        // TODO(albert): confirm
        text: 'The code, accounts and data we set up for you are yours.',
      },
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
