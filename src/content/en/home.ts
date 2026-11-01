import { cases } from '@/content/en/cases';
import { companies } from '@/content/en/companies';
import type { HomeContent } from '@/content/types';

export const home = {
  hero: {
    eyebrow: 'Automation · Integrations · AI agents',
    title: {
      before: 'Stop doing ',
      emphasis: 'by hand',
      after: ' what your tools can do on their own.',
    },
    lead: 'We connect the tools your company already uses (ERP, online shop, CRM, WhatsApp, spreadsheets) and put AI agents on the repetitive work, so your team stops moving data by hand.',
    primary: 'Book a diagnostic',
    secondary: 'See pricing',
    audience: 'For companies of 10 to 100 people',
  },
  runlog: {
    title: 'agents/ops — running',
    description:
      'Illustrative example of an agent run log: shop orders turned into invoices, supplier invoices matched, customer questions answered and a weekly report in preparation.',
    lines: [
      'synced new Shopify orders → invoices in Xero',
      'matched supplier invoices to purchase orders',
      'answered order-status questions on WhatsApp',
      "updated HubSpot from yesterday's calls",
      'flagged a refund for human approval',
      'preparing the weekly ops report…',
    ],
  },
  companies: {
    title: 'We run our own companies with agents',
    items: companies,
  },
  problems: {
    eyebrow: '01 — Sound familiar?',
    title: {
      before: 'Three jobs your team ',
      emphasis: "shouldn't be doing",
      after: ' by hand',
    },
    fixLabel: 'What we do',
    items: [
      {
        id: 'orders',
        title: 'Orders retyped by hand',
        problem:
          'Every order from the shop or a marketplace is copied into the ERP or a spreadsheet. One typo and the wrong item ships.',
        fix: 'We connect the shop to your ERP and invoicing, so each order arrives once, complete, with stock updated.',
      },
      {
        id: 'invoices',
        title: 'Invoices typed in',
        problem:
          'Supplier invoices arrive as PDFs and someone keys them into the accounting system, line by line.',
        fix: 'An agent reads each invoice, matches it to the order and leaves only the exceptions for a person.',
      },
      {
        id: 'customers',
        title: 'Customers served one by one',
        problem:
          'The same questions all day on WhatsApp and email: where is my order, is it in stock, how much is it?',
        fix: 'An agent answers the routine questions with data from your systems and hands the rest to your team, with context.',
      },
    ],
  },
  services: {
    eyebrow: '02 — Services and prices',
    title: {
      before: 'What we do, and ',
      emphasis: 'what it costs',
      after: '',
    },
    lead: 'Every project starts with a fixed-price diagnostic. Prices are in Singapore dollars and exclude GST.',
    more: 'See full pricing',
    calculator: 'Estimate your project',
  },
  process: {
    eyebrow: '03 — How we work',
    title: {
      before: 'Start small, ',
      emphasis: 'prove it',
      after: ', then scale',
    },
    steps: [
      {
        id: 'diagnose',
        label: 'Diagnose',
        text: 'In one to two weeks we map your tools and manual work and hand you a costed plan.',
      },
      {
        id: 'pilot',
        label: 'Pilot',
        text: 'We automate one process end to end, in production, with your team, before you commit to more.',
      },
      {
        id: 'scale',
        label: 'Scale',
        text: 'We extend what worked to more processes and tools, with monitoring and approval steps in place.',
      },
      {
        id: 'maintain',
        label: 'Maintain',
        text: 'We monitor, fix and improve every month, so automations keep working as your tools change.',
      },
    ],
  },
  cases: {
    eyebrow: '04 — Cases',
    title: {
      before: 'Tested on ',
      emphasis: 'our own companies',
      after: ' first',
    },
    lead: 'Before we build an automation for a client, we run it in a business we own.',
    automatedLabel: 'What runs on its own',
    items: cases,
  },
  founder: {
    eyebrow: '05 — Founder',
    // TODO(albert): confirm the founder section title
    title: {
      before: 'You work with ',
      emphasis: 'the person who builds it',
      after: '',
    },
    more: 'More about Albert',
  },
  faq: {
    eyebrow: '06 — FAQ',
    title: { before: 'What people ', emphasis: 'ask us', after: ' most' },
  },
  contact: {
    eyebrow: '07 — Contact',
    title: {
      before: 'Book your ',
      emphasis: 'automation diagnostic',
      after: '.',
    },
    lead: 'Tell us which tools you use and what your team still does by hand. We reply personally and agree the next step with you.',
    mail: 'Prefer email? Write to',
    human: 'A human replies, personally.',
    book: 'Prefer a call? Pick a time',
  },
} satisfies HomeContent;
