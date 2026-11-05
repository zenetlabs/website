// TODO(albert): review this page: the tiers, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [essential, standard, extended] = services.maintenance.prices;

export const maintenance = {
  meta: {
    metaTitle: 'Maintenance for automations and AI agents | Zenet Labs',
    description:
      'Monthly maintenance for the integrations, automations and AI agents we build: monitoring, fixes, updates and a monthly review, in three published plans.',
  },
  hero: {
    title: {
      before: 'Maintenance that keeps your ',
      emphasis: 'automations working',
      after: '',
    },
    lead: `Tools change, and an automation that worked last month can stop without warning. Our maintenance monitors what we built, fixes it and updates it when your tools change, and reviews every month what to improve. There are three plans: ${formatPrice('en', essential)}, ${formatPrice('en', standard)} and ${formatPrice('en', extended)}, excluding GST.`,
  },
  facts: {
    who: 'Companies with an integration, an automation or an AI agent from us in production',
    timeline:
      'Monthly and optional; you choose a plan once the project is live',
    start: 'Choose a plan when your project goes live',
  },
  cta: {
    title: 'Keep your project running',
    text: 'Tell us what we built for you and what you need watched. We reply with the plan that fits.',
    button: 'Ask about maintenance',
  },
  useCases: {
    title: {
      before: 'What a plan ',
      emphasis: 'takes off your hands',
      after: '',
    },
    items: [
      {
        id: 'monitoring',
        title: 'Monitoring and error alerts',
        text: 'We watch the automations and agents we built, so a failure is noticed and handled before it reaches your customers.',
      },
      {
        id: 'fixes',
        title: 'Fixes',
        text: 'When something breaks, we find the cause and fix it, instead of leaving your team to work around it.',
      },
      {
        id: 'updates',
        title: 'Updates when your tools change',
        text: 'When one of your tools changes, we update the connection so the data keeps moving.',
      },
      {
        id: 'review',
        title: 'A monthly review',
        text: 'Each month we look at what to improve, so the automations keep up with how your team works.',
      },
    ],
  },
  how: {
    title: {
      before: 'How a plan ',
      emphasis: 'works month to month',
      after: '',
    },
    steps: [
      {
        id: 'choose',
        label: 'Choose',
        text: 'Once your project is live, you pick the plan that fits what we built.',
      },
      {
        id: 'watch',
        label: 'Watch',
        text: 'We monitor your automations and agents and receive an alert when one of them fails.',
      },
      {
        id: 'fix',
        label: 'Fix',
        text: 'We fix what breaks and update the connections when your tools change.',
      },
      {
        id: 'improve',
        label: 'Improve',
        text: 'We review each month what to improve, and for agents we tune them and keep their cost under control.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    title: {
      before: 'We run ',
      emphasis: 'the same way',
      after: '',
    },
    text: 'The agents and automations at Viatsy run every day, and a person reviews what they draft before it goes out. Maintenance applies the same routine to yours.',
    points: [
      'A drafted first reply to every inquiry, which a person reviews and sends',
      'Payment requests and reminders sent on schedule',
    ],
    page: 'viatsyCase',
  },
  faq: {
    title: {
      before: 'Questions about ',
      emphasis: 'maintenance',
      after: '',
    },
    items: [
      {
        id: 'maintenance-needed',
        question: 'Do automations really need maintenance?',
        answer:
          'Yes. The tools they connect change their fields, rules and screens, and an automation that worked last month can stop without warning. Monitoring catches it, and we fix and update it when your tools change.',
      },
      {
        id: 'maintenance-plans',
        question: 'How do the three plans differ?',
        answer: `${essential.label} (${formatPriceSummary('en', [essential])}) covers one integration or automation with monitoring and fixes. ${standard.label} (${formatPriceSummary('en', [standard])}) covers several automations and adds monthly improvements. ${extended.label} (${formatPriceSummary('en', [extended])}) covers AI agents in production, with evaluation, tuning and cost control.`,
      },
      {
        id: 'maintenance-optional',
        question: 'Is maintenance compulsory?',
        answer:
          'No. Maintenance is monthly and optional, and you choose a plan once the project is live. We build on your accounts wherever we can, so everything keeps running and is documented if we stop working together.',
      },
      {
        id: 'maintenance-agents',
        question: 'What does maintenance cover for an AI agent?',
        answer:
          "Evaluation, tuning and cost control, within the usage and cost limits agreed when the agent was built. Every action is logged, so when something goes wrong we find the cause, fix it and add the case to the agent's tests.",
      },
    ],
  },
  related: ['agents', 'integrations'],
} satisfies ServicePageContent;
