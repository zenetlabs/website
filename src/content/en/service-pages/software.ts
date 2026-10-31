// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.web.prices;
const price = formatPrice('en', row);
const diagnostic = formatPriceSummary('en', services.diagnostic.prices);

export const software = {
  meta: {
    metaTitle: 'Custom software development for SMEs | Zenet Labs',
    description:
      'Custom software for Singapore SMEs: customer portals, internal tools and web apps built around how you work and connected to the systems you run.',
  },
  hero: {
    eyebrow: 'Services · Custom software',
    title: {
      before: 'Custom software development, ',
      emphasis: 'built around how you work',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `Custom software is a web app, customer portal or internal tool designed around your processes, instead of bending your processes to fit someone else's product. We build it for Singapore companies of 10 to 100 people when off-the-shelf tools no longer fit, and we connect it to the systems you already run. Projects cost ${price}, excluding GST, and the first usable version is usually in your team's hands eight to twelve weeks after the diagnostic.`,
  },
  facts: {
    who: 'Companies whose work no longer fits a spreadsheet or an off-the-shelf tool, or whose customers need a portal of their own',
    // TODO(albert): confirm the timeline
    timeline:
      '8–12 weeks to a first version in use, then a release every few weeks',
    start: `The automation diagnostic (${diagnostic}), credited to the project if you go ahead within 60 days`,
  },
  cta: {
    title: 'Describe the tool you wish you had',
    text: 'Tell us what your team works around today. In the diagnostic we check whether to build, buy or connect, and what the first version would cost.',
    button: 'Book a diagnostic',
  },
  useCases: {
    eyebrow: 'What we build',
    title: {
      before: 'Software for the ',
      emphasis: 'parts of the business',
      after: ' no product covers',
    },
    items: [
      {
        id: 'portal',
        title: 'Customer portals',
        text: 'A place where customers place orders, track bookings, download documents and pay, without emailing your team.',
      },
      {
        id: 'internal',
        title: 'Internal tools',
        text: 'The system that replaces the spreadsheet everyone edits: quoting, scheduling, stock or job tracking, with the right permissions for each role.',
      },
      {
        id: 'websites',
        title: 'Websites that do work',
        text: 'Fast, accessible sites that are easy to find in search and connected to your CRM and booking tools, so enquiries arrive complete.',
      },
      {
        id: 'ai-features',
        title: 'AI inside the tool',
        text: 'Search across your own documents, drafted replies or automatic data entry, built into the tool your team already opens every day.',
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: {
      before: 'Small releases, ',
      emphasis: 'early feedback',
      after: '',
    },
    steps: [
      {
        id: 'design',
        label: 'Design with the users',
        text: 'We sketch the screens with the people who will use them and agree the first version: the smallest one that is genuinely useful.',
      },
      {
        id: 'build',
        label: 'Build in short cycles',
        text: 'You see working software every week or two, on a test site with your data, and you decide what comes next.',
      },
      {
        id: 'launch',
        label: 'Launch on your accounts',
        text: 'It runs on hosting and accounts you own, with backups, error monitoring and access you control.',
      },
      {
        id: 'evolve',
        label: 'Evolve',
        text: 'After launch we keep improving it on a maintenance plan, or hand the code and documentation to your own developers.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Case',
    title: {
      before: '',
      emphasis: 'Taplany',
      after: ', our own software for travel agencies',
    },
    text: 'Taplany started as the tools we built to run Viatsy. It became a product so that other travel agencies can run their website, enquiries, proposals, bookings, payments and WhatsApp in one place.',
    points: [
      'Website, enquiries, proposals, bookings, payments and WhatsApp in one product',
      "AI built in, such as replies drafted in each agency's tone for a person to approve",
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: {
      before: 'Questions about ',
      emphasis: 'custom software',
      after: '',
    },
    items: [
      {
        id: 'software-build-or-buy',
        question: 'Should we build custom software or buy a product?',
        answer:
          "Buy when a product covers most of what you need, and we will say so in the diagnostic. Build when the tool you need doesn't exist, when you are paying for several products to cover one process, or when the software is part of what makes you different. Often the answer is both: an off-the-shelf core with a small custom piece connected to it.",
      },
      {
        // TODO(albert): confirm the stack and the hosts
        id: 'software-stack',
        question: 'Which technologies do you use?',
        answer:
          'Mainstream, well-supported ones: TypeScript and React for the interface, proven databases, and hosting on Cloudflare, AWS or Google Cloud depending on your needs. We avoid anything only we could maintain, so another developer can take the code over.',
      },
      {
        id: 'software-handover',
        question: 'Can our own developers take it over later?',
        answer:
          'Yes. The code lives in your repository from day one, with documentation, automated tests and a deployment your team can run. If you hire developers later, we plan the handover with them.',
      },
      {
        id: 'software-changes',
        question: 'What if we need changes after launch?',
        answer:
          'Small changes are part of a maintenance plan; larger features get their own fixed quote. Because we release in small steps, adding something later never means starting again.',
      },
    ],
  },
  related: ['integrations', 'agents'],
} satisfies ServicePageContent;
