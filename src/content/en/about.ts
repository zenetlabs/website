import type { AboutPageContent } from '@/content/types';

export const aboutPage = {
  meta: {
    title: 'About',
    metaTitle: 'About Zenet Labs and its founder, Albert Sabaté',
    description:
      'Zenet Labs builds automations and AI agents for SMEs. Our team, led by founder Albert Sabaté, runs its own companies with agents before building yours.',
  },
  title: {
    before: 'Automation built by people who ',
    emphasis: 'run businesses',
    after: '',
  },
  // TODO(albert): confirm the studio description
  lead: 'At Zenet Labs we build automations, integrations and AI agents for SMEs, and we use the same tools every day in the companies we run.',
  story: [
    {
      id: 'track',
      parts: [
        'Albert founded Zenet Labs in 2022 and leads the team. He has spent 15+ years building and leading engineering teams: he led engineering at Splyt as its global mobility network scaled across several countries, and made core contributions to ',
        { text: 'Brisa', href: 'https://brisa.build/' },
        ', an open-source web framework.',
      ],
    },
    {
      id: 'today',
      // TODO(albert): confirm
      parts: [
        'He also runs Viatsy and Taplany, our own companies, with agents doing the repetitive work. What works there is what we build for clients.',
      ],
    },
  ],
  principles: {
    title: 'How we work',
    items: [
      {
        id: 'builder',
        tiles: ['human'],
        title: 'Scoped and built by the same team',
        // TODO(albert): confirm
        text: 'No account managers in between: the people who scope your project build it.',
      },
      {
        id: 'ownership',
        tiles: ['app'],
        title: 'Yours to keep',
        text: 'Code, accounts and data stay with you. If we stop working together, everything keeps running.',
      },
      {
        id: 'approval',
        tiles: ['agent', 'human'],
        title: 'People approve what matters',
        text: 'Agents act within agreed limits, and anything with consequences waits for a person.',
      },
      {
        id: 'measured',
        tiles: [],
        title: 'Measured, not promised',
        text: 'We measure each process before we touch it and compare after go-live.',
      },
    ],
  },
  companies: {
    title: 'Companies we run',
    lead: 'Products we build and operate with automations and agents. They are where we learn what works.',
    cases: 'Read the case studies',
  },
  vision: {
    title: 'Where this is going',
    text: 'We think every company will end up with agents running part of its operations, with people setting the goals and checking the results: an agentic company. We help SMEs get there one process at a time, starting with the work nobody wants to do by hand.',
  },
  cta: {
    title: 'Tell us what your team does by hand',
    text: 'We reply and agree the next step with you.',
    button: 'Book a call',
  },
} satisfies AboutPageContent;
