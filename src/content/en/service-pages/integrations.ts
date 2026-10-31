// TODO(albert): review this page: timelines, the case, the FAQ answers
import { services } from '@/content/en/services';
import type { ServicePageContent } from '@/content/types';
import { formatPrice, formatPriceSummary } from '@/lib/money';

const [row] = services.integration.prices;
const price = formatPrice('en', row);
const diagnostic = formatPriceSummary('en', services.diagnostic.prices);

export const integrations = {
  meta: {
    metaTitle: 'Xero, Shopify and HubSpot integrations | Zenet Labs',
    description:
      'We connect Xero, Shopify, HubSpot, WhatsApp and your spreadsheets so orders, invoices and customer records move between them without copy and paste.',
  },
  hero: {
    eyebrow: 'Services · Integrations',
    title: {
      before: 'Xero, Shopify and HubSpot integrations that ',
      emphasis: 'keep your data in step',
      after: '',
    },
    // TODO(albert): confirm the timeline
    lead: `An integration connects two or more of your tools so data moves between them on its own: a Shopify order becomes a Xero invoice, a won deal in HubSpot creates the customer and the invoice, a payment updates the CRM. We build them for Singapore companies of 10 to 100 people whose tools don't talk to each other. Projects cost ${price}, excluding GST, and a typical integration goes live three to six weeks after the diagnostic.`,
  },
  facts: {
    who: 'Companies running Xero, Shopify, HubSpot, WooCommerce or WhatsApp Business side by side, with someone copying data between them',
    // TODO(albert): confirm the timeline
    timeline: '3–6 weeks per integration, after a 1–2 week diagnostic',
    start: `The automation diagnostic (${diagnostic}), credited to the project if you go ahead within 60 days`,
  },
  cta: {
    title: 'Show us the tools you use',
    text: 'List the systems you run and where people still copy data between them. In the diagnostic we confirm what can be connected and what it costs.',
    button: 'Book a diagnostic',
  },
  useCases: {
    eyebrow: 'Common integrations',
    title: {
      before: 'The connections we ',
      emphasis: 'build most',
      after: '',
    },
    lead: 'WooCommerce, Microsoft 365, Google Workspace and spreadsheets too: if a tool has an API or a reliable export, we can usually connect it.',
    items: [
      {
        id: 'pair-1',
        title: 'Shopify and Xero',
        text: 'Orders, refunds, fees and payouts reach Xero as invoices and payments, so the books match the shop without month-end reconciliation by hand.',
      },
      {
        id: 'pair-2',
        title: 'HubSpot and Xero',
        text: 'A won deal creates the contact and the invoice in Xero, and payment status flows back to HubSpot so sales can see who has paid.',
      },
      {
        id: 'pair-3',
        title: 'Shopify and HubSpot',
        text: 'Customers and orders sync to HubSpot, so follow-ups and campaigns use what people actually bought.',
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp Business and your systems',
        text: 'Order and booking updates go out on WhatsApp from your own data, and replies land in the right customer record.',
      },
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: {
      before: 'Built to ',
      emphasis: 'survive real data',
      after: '',
    },
    steps: [
      {
        id: 'map',
        label: 'Map the data',
        text: 'We list what each tool holds, which one is the source of truth for each field, and what should happen when two records disagree.',
      },
      {
        id: 'build',
        label: 'Build on your accounts',
        text: 'The integration runs on accounts you own, with a log of every sync, alerts and automatic retries when an API is down.',
      },
      {
        id: 'test',
        label: 'Test with real records',
        text: 'Before switching it on we replay a sample of real orders, deals and invoices and check the results with whoever keeps the books.',
      },
      {
        id: 'handover',
        label: 'Hand over',
        text: 'You get documentation of every field mapping and a short guide for your team. A maintenance plan keeps it working when a tool changes its API.',
      },
    ],
  },
  // TODO(albert): confirm the case
  case: {
    eyebrow: 'Case',
    title: {
      before: 'One timeline per booking at ',
      emphasis: 'Taplany',
      after: '',
    },
    text: 'Taplany is the platform we built for travel agencies. It brings the channels an agency works with into each booking, so nobody has to switch between tools to see what happened.',
    points: [
      'WhatsApp, email and payment links in the same timeline as each booking',
      'Itineraries and supplier confirmations pasted as text, turned into structured bookings',
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    title: {
      before: 'Questions about ',
      emphasis: 'integrations',
      after: '',
    },
    items: [
      {
        id: 'integrations-ready-made-connectors',
        question: 'Why not just install a ready-made connector?',
        answer:
          'Try one first if it covers your case: a ready-made connector is cheaper. Connectors tend to break down on the details, such as multi-currency payouts, partial refunds, custom fields or several shops feeding one set of books. We build an integration when the off-the-shelf option has already cost you more in fixes than it saved.',
      },
      {
        id: 'integrations-conflicts',
        question: 'What happens when two systems disagree?',
        answer:
          "We decide that before we build. Each field gets one system as its source of truth, for example prices in Shopify and payment status in Xero, and the integration never overwrites it from the other side. When a record can't be matched, it waits in a review list instead of being guessed.",
      },
      {
        id: 'integrations-failures',
        question: 'What if an API is down or a sync fails?',
        answer:
          'The integration retries on its own, and if it still fails it records what was not sent and alerts the person you choose. Nothing is lost silently: when the service is back, the pending records go through in order.',
      },
      {
        id: 'integrations-existing-data',
        question: 'Can you move our existing records across as well?',
        answer:
          "Yes. We usually import the history you need, such as open invoices, active customers or this year's orders, check the totals with you, and only then switch the live sync on.",
      },
    ],
  },
  related: ['automation', 'software'],
} satisfies ServicePageContent;
