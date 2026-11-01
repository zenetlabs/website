import type { CalculatorPageContent } from '@/content/types';

export const calculatorPage = {
  meta: {
    title: 'Price calculator',
    metaTitle: 'Price calculator for automation and AI projects | Zenet Labs',
    description:
      'Answer six questions for an indicative range in Singapore dollars (excl. GST), a timeline and a suggested maintenance plan. Not a quote: the final price comes from the diagnostic.',
  },
  breadcrumb: { label: 'Breadcrumb', pricing: 'Pricing' },
  eyebrow: 'Price calculator',
  title: { before: 'What could your project ', emphasis: 'cost', after: '?' },
  lead: "Six questions, about a minute, and an indicative range for your project. You don't need to leave an email to see it.",
  disclaimer: {
    title: 'Indicative estimate, not a quote',
    text: 'The range comes from fixed rules built on our published prices, not from an AI model. The final price comes from the diagnostic, where we look at your real processes and tools.',
  },
  taxNote: 'Prices in Singapore dollars (S$), excluding GST.',
  privacy: 'We only keep your answers if you send them to us.',
  pricingLink: 'See the full price list',
  submit: 'See my estimate',
  questions: {
    type: {
      legend: 'What do you want to build first?',
      options: {
        automation: {
          label: 'Connect tools or automate a process',
          hint: 'Orders, invoices or data moving between tools on their own.',
        },
        agent: {
          label: 'An AI agent that does a task',
          hint: 'Triage, replies or reading documents, with a person approving what matters.',
        },
        web: { label: 'A custom website, portal or internal tool' },
      },
    },
    tools: {
      legend: 'Which tools are involved?',
      hint: 'Tick every kind of tool it has to work with. How many you tick counts too.',
      options: {
        erp: { label: 'Accounting or ERP', hint: 'Xero, QuickBooks, Odoo…' },
        shop: { label: 'Online shop', hint: 'Shopify, WooCommerce…' },
        crm: { label: 'CRM', hint: 'HubSpot, Pipedrive, Salesforce…' },
        messaging: { label: 'WhatsApp, email inbox or live chat' },
        sheets: { label: 'Spreadsheets', hint: 'Excel, Google Sheets' },
        documents: {
          label: 'PDFs or scanned documents',
          hint: 'Invoices, delivery orders',
        },
        custom: { label: 'An in-house or legacy system' },
        other: { label: 'Another tool' },
      },
    },
    volume: {
      legend: 'How many orders, documents or messages a month?',
      options: {
        low: { label: 'Fewer than 100' },
        medium: { label: '100 to 1,000' },
        high: { label: '1,000 to 10,000' },
        'very-high': { label: 'More than 10,000' },
      },
    },
    extras: {
      legend: 'Anything else to include?',
      hint: 'Leave both empty if not. Your main project is already counted.',
      options: {
        agent: { label: 'An AI agent' },
        web: { label: 'A website, portal or app' },
      },
    },
    urgency: {
      legend: 'How soon do you need it?',
      options: {
        flexible: { label: 'No rush: fit it around other work' },
        standard: { label: 'In the next few months' },
        urgent: { label: 'As soon as possible' },
      },
    },
    maintenance: {
      legend: 'Do you want us to run and maintain it afterwards?',
      options: {
        yes: { label: 'Yes, with a maintenance plan' },
        no: { label: 'No, my team will run it' },
      },
    },
  },
  result: {
    title: 'Your indicative estimate',
    empty:
      'Answer the questions and press "See my estimate". Your range appears here, on this page.',
    short:
      'Indicative estimate, not a quote. The final price comes from the diagnostic.',
    labels: {
      total: 'Project',
      timeline: 'Timeline',
      maintenance: 'Maintenance',
      diagnostic: 'First step',
      answers: 'Your answers',
    },
    weeks: '{min}–{max} weeks after the diagnostic',
    weeksSingle: '{n} weeks after the diagnostic',
    breakdown: 'How we got there',
    tools: { none: 'no tools to connect', one: '1 tool', many: '{n} tools' },
    custom: 'including an in-house or legacy system',
    addOn: 'added to the main project',
    capped: 'at the top of what we can estimate here',
    volume: 'Volume',
    urgency: 'Urgency',
    noChange: 'no change',
    percent: '{sign}{n}%',
    rounding:
      'Applied to every line. Ranges are rounded outwards to multiples of {step}, and no line goes below its published starting price or above its published range.',
    cappedNote:
      'At least one line has reached the top of what this calculator can estimate. Projects this size are priced in the diagnostic.',
    maintenanceWanted: 'Suggested plan: {plan}, {price}',
    maintenanceNotWanted:
      'Not included. If you change your mind, the plan that fits is {plan} ({price}).',
    diagnosticText:
      '{name}, {price}. It is credited to the project if you continue within 60 days.',
    share:
      "This page's address keeps your answers, so you can bookmark it or send it to a colleague.",
    change: 'Change my answers',
  },
  contact: {
    title: { before: 'Want to talk it ', emphasis: 'through', after: '?' },
    lead: "Leave your details and we'll reply personally. Your answers and this estimate are added to the message, so we start from the same numbers. It's optional: the estimate above is yours either way.",
    intro: 'Price calculator estimate (indicative, rules {version}):',
    page: 'Result page',
    mail: 'Prefer email? Write to',
  },
} satisfies CalculatorPageContent;
