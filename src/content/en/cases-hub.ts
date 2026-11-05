import { cases } from '@/content/en/cases';
import type { CasesHubContent } from '@/content/types';

export const casesHub = {
  meta: {
    title: 'Case studies',
    metaTitle: 'Case studies: AI agents at Viatsy and Taplany',
    description:
      'Before we build an automation for a client, we run it in a business we own. See what runs on its own at Viatsy and Taplany, two of our companies.',
  },
  title: {
    before: 'Automation tested on ',
    emphasis: 'our own companies',
    after: ' first',
  },
  lead: 'Before we build an automation for a client, we run it in a business we own. These are two of the companies we run with agents, what runs on its own in each, and where to read the full story.',
  cases: {
    title: {
      before: 'Two of our companies, ',
      emphasis: 'run with agents',
      after: '',
    },
    lead: 'In every case, agents prepare the work and a person approves what reaches a customer.',
    automatedLabel: 'What runs on its own',
    actors: { tool: 'Your tools', agent: 'Agent', human: 'A person' },
    items: cases,
  },
  cta: {
    title: 'Start with the diagnostic',
    text: 'Tell us what your team does by hand and we will reply personally.',
    button: 'Book a diagnostic',
  },
} satisfies CasesHubContent;
