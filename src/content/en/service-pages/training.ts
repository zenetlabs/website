// TODO(albert): review this page: lead times, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice } from '@/lib/money';

const [workshop, mentoring] = services.training.prices;

export const training = {
  meta: {
    metaTitle: 'Corporate AI training for teams in Singapore | Zenet Labs',
    description:
      'Hands-on AI training for teams, built on your own processes rather than generic demos, with monthly mentoring while your people put AI to work.',
  },
  hero: {
    eyebrow: 'Services · AI training',
    title: {
      before: 'AI training for teams, built on ',
      emphasis: 'your own work',
      after: '',
    },
    // TODO(albert): confirm the lead time
    lead: `Our AI training is a hands-on workshop where your team learns to use AI on its own processes, followed, if you want, by monthly mentoring while the habits take hold. It is for Singapore companies of 10 to 100 people that want their staff using AI safely and productively, not just having heard of it. A workshop costs ${formatPrice('en', workshop)} and mentoring ${formatPrice('en', mentoring)}, excluding GST, and a workshop can usually be scheduled two to four weeks after we agree the content.`,
  },
  facts: {
    who: 'Companies of 10 to 100 people that want their staff using AI well, from leadership to the front line',
    // TODO(albert): confirm the formats
    timeline: 'Workshops of half a day to two days; mentoring month to month',
    start:
      'A 30-minute call to agree the topics, the processes we will work on and who attends',
  },
  cta: {
    title: 'Plan a workshop for your team',
    text: 'Tell us how many people, which teams and what they spend their days on. We reply with a proposed agenda and a fixed price.',
    button: 'Ask about a workshop',
  },
  useCases: {
    eyebrow: 'What the training covers',
    title: {
      before: 'Skills your team ',
      emphasis: 'uses on Monday',
      after: '',
    },
    items: [
      {
        id: 'foundations',
        title: 'How AI tools really behave',
        text: 'What current models are good and bad at, why they make things up, and how to check their work, so people trust them the right amount.',
      },
      {
        id: 'own-work',
        title: 'Your processes, live',
        text: 'We work through real tasks from your team, such as emails, reports, proposals or data clean-up, and each person leaves with prompts and workflows they can reuse.',
      },
      {
        // TODO(albert): legal review of the safe-use wording
        id: 'safe-use',
        title: 'Safe use',
        text: 'Which data can go into which tool, what the PDPA means for it, and a short usage policy your team can actually follow.',
      },
      {
        id: 'leaders',
        title: 'For leadership',
        text: 'Where AI pays off in your business, what to automate and what to train people for, and how to measure the result.',
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: {
      before: 'From one workshop to ',
      emphasis: 'lasting habits',
      after: '',
    },
    steps: [
      {
        id: 'prepare',
        label: 'Prepare',
        text: 'Beforehand we collect a few real tasks from each team and agree which tools your company allows.',
      },
      {
        // TODO(albert): where can workshops be held in person?
        id: 'workshop',
        label: 'Workshop',
        text: 'Hands-on sessions, in person or online, where everyone works on their own tasks instead of watching slides.',
      },
      {
        id: 'practise',
        label: 'Practise',
        text: 'Each person leaves with a short list of tasks to move to AI that week, and a place to share what worked.',
      },
      {
        id: 'mentoring',
        label: 'Mentoring',
        text: 'With monthly mentoring we review what the team has built, help where people get stuck and update the policy as the tools change.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Case',
    title: {
      before: 'How our own team ',
      emphasis: 'works with AI',
      after: '',
    },
    text: 'At Viatsy and Taplany, AI drafts the first version of replies, proposals and website content every day, and a person reviews it before it goes out. The training is built on the same routines.',
    points: [
      'Replies drafted by AI, reviewed and sent by a person',
      'Website content drafted and fact-checked before it is published',
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: { before: 'Questions about ', emphasis: 'AI training', after: '' },
    items: [
      {
        id: 'training-who',
        question: 'Who should attend?',
        answer:
          'Anyone who writes, analyses or answers for a living, which is most of an office. We usually run one session for leadership and one or two for teams, grouped by the kind of work they do, so the examples fit.',
      },
      {
        id: 'training-technical',
        question: 'Do people need technical skills?',
        answer:
          'No. The workshop assumes nothing beyond everyday office tools. More technical staff get an extra track on automating with AI and connecting it to your systems.',
      },
      {
        id: 'training-tools',
        question: 'Which AI tools do you teach?',
        answer:
          "The ones your company allows or is considering, such as ChatGPT, Claude, Gemini or Microsoft Copilot. The skills carry over between tools, and if you haven't chosen yet, we help you choose.",
      },
      {
        id: 'training-policy',
        question: 'Can you help us write an AI usage policy?',
        answer:
          'Yes. We draft a short one with you: which tools are approved, what data must never go into them, when a person must review the output and who to ask. It is written to be read, not filed.',
      },
    ],
  },
  related: ['agents', 'automation'],
} satisfies ServicePageContent;
