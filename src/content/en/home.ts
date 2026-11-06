import { assistantIntro } from '@/content/en/assistant-intro';
import { cases } from '@/content/en/cases';
import { companies } from '@/content/en/companies';
import { diagnosticPlan } from '@/content/en/diagnostic-plan';
import type { HomeContent } from '@/content/types';

export const home = {
  hero: {
    title: {
      before: 'Stop doing ',
      emphasis: 'by hand',
      after: ' what your tools can do.',
    },
    lead: 'We connect the tools your company already uses (ERP, online shop, CRM, WhatsApp, spreadsheets) and put AI agents on the repetitive work, so your team stops moving data by hand.',
    fact: '{price} fixed-price diagnostic, credited to the project if you continue within 60 days.',
    primary: 'Book a call',
    secondary: 'See pricing',
    audience: 'For companies of 10 to 100 people',
  },
  desk: {
    label: 'Ask the assistant',
    intro: assistantIntro,
    human: {
      title: 'Ask us',
      welcome:
        'Ask us anything about your tools and processes. A person replies by email, usually within a working day.',
      label: 'Your question for us',
      placeholder: 'Type your question',
    },
    call: {
      text: 'Prefer to talk? Our voice assistant is an AI, not a person: it can answer questions and book a call.',
      button: 'Call the agent',
    },
    slots: {
      title: 'Book a 30-minute call',
      meta: '30 minutes on Google Meet',
      group: 'Next free times',
      timesIn: 'Times in {zone}',
      seeAll: 'See all times',
      seeAvailable: 'See available times',
      unavailable:
        "Online booking isn't available right now. Send us a message instead and we will suggest a time.",
      message: 'Send a message',
    },
    handoff: 'You work with the person who builds it.',
  },
  companies: {
    title: 'We run our own companies with agents',
    items: companies,
  },
  problems: {
    title: {
      before: 'Three jobs your team ',
      emphasis: "shouldn't be doing",
      after: ' by hand',
    },
    todayLabel: 'Today',
    fixLabel: 'With us',
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
    title: {
      before: 'What we do, and ',
      emphasis: 'what it costs',
      after: '',
    },
    lead: 'Every project starts with a fixed-price diagnostic. Prices are in Singapore dollars and exclude GST.',
    more: 'See full pricing',
    calculator: 'Estimate your project',
    book: 'Book the diagnostic',
    oneOff: 'One-off',
    timeline: '1–2 weeks',
    plan: { title: 'Your costed plan', items: diagnosticPlan },
  },
  process: {
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
    title: {
      before: 'Tested on ',
      emphasis: 'our own companies',
      after: ' first',
    },
    lead: 'Before we build an automation for a client, we run it in a business we own.',
    more: 'All case studies',
    automatedLabel: 'What runs on its own',
    actors: { tool: 'Your tools', agent: 'Agent', human: 'A person' },
    items: cases,
  },
  faq: {
    title: { before: 'What people ', emphasis: 'ask us', after: ' most' },
    groups: [
      { id: 'scope', label: 'What we do and who it is for' },
      { id: 'terms', label: 'Time, cost and ownership' },
      { id: 'trust', label: 'Data, risk and working together' },
    ],
  },
  contact: {
    title: {
      before: 'Book your ',
      emphasis: 'automation diagnostic',
      after: '.',
    },
    lead: 'Tell us which tools you use and what your team still does by hand. We reply personally and agree the next step with you.',
    mail: 'Prefer email? Write to',
    human: 'A human replies, personally.',
    book: 'Prefer a call? Pick a time',
    voice: {
      text: 'Prefer to talk? Our voice assistant is an AI, not a person: it can answer questions and book a call.',
      button: 'Talk to the assistant',
    },
  },
  doors: {
    ask: {
      title: 'Ask the agent',
      text: 'About our services, prices or how a project works.',
    },
    call: {
      title: 'Call the agent',
      text: 'Our voice assistant is an AI, not a person.',
    },
    write: {
      title: 'Write to us',
      text: 'Use the contact form.',
    },
  },
} satisfies HomeContent;
