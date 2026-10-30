import type { AboutPageContent } from '@/content/types';

export const aboutPage = {
  eyebrow: 'About',
  title: {
    before: 'Automation built by people who ',
    emphasis: 'run businesses',
    after: '',
  },
  // TODO(albert): confirm the studio description
  lead: 'Zenet Labs is a small studio founded in 2022 by Albert Sabaté. We build automations, integrations and AI agents for SMEs, and we use the same tools every day in the companies we run.',
  story: [
    {
      id: 'track',
      parts: [
        'Albert has spent 15+ years building and leading engineering teams. He led engineering at Splyt as its global mobility network scaled across several countries, and made core contributions to ',
        { text: 'Brisa', href: 'https://brisa.build/' },
        ', an open-source web framework.',
      ],
    },
    {
      id: 'today',
      // TODO(albert): confirm
      parts: [
        'Today he runs Viatsy and Taplany with agents doing the repetitive work, and works directly with every Zenet Labs client.',
      ],
    },
  ],
  principles: {
    title: 'How we work',
    items: [
      {
        id: 'builder',
        title: 'You talk to the builder',
        // TODO(albert): confirm
        text: 'No account managers in between: the person who scopes your project builds it.',
      },
      {
        id: 'ownership',
        title: 'Yours to keep',
        text: 'Code, accounts and data stay with you. If we stop working together, everything keeps running.',
      },
      {
        id: 'approval',
        title: 'People approve what matters',
        text: 'Agents act within agreed limits, and anything with consequences waits for a person.',
      },
      {
        id: 'measured',
        title: 'Measured, not promised',
        text: 'We measure each process before we touch it and compare after go-live.',
      },
    ],
  },
  companies: {
    title: 'Companies we run',
    lead: 'Products we build and operate with automations and agents. They are where we learn what works.',
  },
  vision: {
    title: 'Where this is going',
    text: 'We think every company will end up with agents running part of its operations, with people setting the goals and checking the results: an agentic company. We help SMEs get there one process at a time, starting with the work nobody wants to do by hand.',
  },
  cta: {
    title: 'Tell us what your team does by hand',
    text: 'We reply personally and agree the next step with you.',
    button: 'Book a diagnostic',
  },
} satisfies AboutPageContent;
