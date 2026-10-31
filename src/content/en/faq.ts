// TODO(albert): review answers
import { services } from '@/content/en/services';
import type { FaqItem, ServiceId } from '@/content/types';
import { formatPriceSummary } from '@/lib/money';
import { PUBLIC_EMAIL } from '@/lib/site';

const price = (id: ServiceId) => formatPriceSummary('en', services[id].prices);

export const faq = [
  {
    id: 'what-we-do',
    question: "What do you do, and what don't you do?",
    answer:
      "We connect the tools your company already uses, automate the repetitive work between them and put AI agents into production for tasks such as triage, replies and reading documents. We also build custom web apps, train teams and maintain what we build. We don't resell software licences, run paid ads or replace your accountant or IT support.",
  },
  {
    id: 'fit',
    question: 'Which companies is this for?',
    answer:
      "Companies of about 10 to 100 people that run on several tools that don't talk to each other, such as an accounting system, an online shop, a CRM, WhatsApp and spreadsheets, and lose hours copying data between them. A smaller team can start with a single integration.",
  },
  {
    id: 'tools',
    question: 'Which tools do you work with?',
    answer:
      'Most often Xero, Shopify, WooCommerce, HubSpot, Google Workspace, Microsoft 365, WhatsApp Business and spreadsheets. If a tool has an API or a reliable export, we can usually connect it. The diagnostic confirms what is possible before you commit to anything.',
  },
  {
    id: 'replace-tools',
    question: 'Do we have to change the tools we use?',
    answer:
      "No. We work with what you already have and suggest a change only when a tool is the bottleneck, for example when it can't connect to anything else. Any change we suggest comes with its cost, so you decide.",
  },
  {
    id: 'timeline',
    question: 'How long does a project take?',
    answer:
      'The diagnostic takes one to two weeks. Its plan sets a timeline for each phase, and we scope the first delivery so it goes live in weeks, not months. Larger agents and custom apps are split into phases, each with its own result.',
  },
  {
    id: 'prices',
    question: 'How much does it cost?',
    answer: `The diagnostic costs ${price('diagnostic')}, credited to the project if you continue within 60 days. An integration or automation costs ${price('integration')}, an AI agent in production ${price('agent')} and a custom web or app ${price('web')}. Prices exclude GST. Training, maintenance and growth are on the pricing page.`,
  },
  {
    id: 'maintenance',
    question: 'What does maintenance include?',
    answer:
      'Monitoring and error alerts, fixes, updates when one of your tools changes, and a monthly review of what to improve. The three monthly plans differ in how many automations and agents they cover and how much improvement work they include.',
  },
  {
    id: 'ownership',
    question: 'Who owns the code and the data?',
    answer:
      'You do. We build on your accounts wherever we can, the code we write for you is yours once the project is paid, and your data stays in your systems. If we stop working together, everything keeps running and is documented.',
  },
  {
    id: 'privacy',
    question: 'Where is our data kept, and how do you handle privacy?',
    answer:
      "We agree where data lives before we build, and we list every provider that will touch it. We work under Singapore's PDPA and, for clients in Europe, the GDPR, with a data processing agreement. We use AI providers that don't train on your data, and we tell you early if a use case is regulated under the EU AI Act, such as screening job candidates. Enquiries you send through this site are stored in a Cloudflare database in the European Union.",
  },
  {
    id: 'mistakes',
    question: 'What happens if an agent makes a mistake?',
    answer:
      "We plan for it. Agents work within limits you agree, actions with consequences, such as payments, refunds or messages to key customers, wait for a person's approval, and every action is logged. When something goes wrong, monitoring shows it, we fix the cause and add the case to the agent's tests.",
  },
  {
    id: 'models',
    question: 'Which AI models do you use?',
    answer:
      'Whichever does the task reliably at the lowest cost and meets your privacy needs: models from providers such as OpenAI, Anthropic or Google, or open models hosted in a region you choose. We test them on your real cases before choosing.',
  },
  {
    id: 'training',
    question: 'Do you train our team?',
    answer:
      'Yes. Workshops are hands-on and use your own processes, not generic examples. Monthly mentoring keeps the team going afterwards: we review what they build, help when they get stuck and agree simple rules for using AI at work.',
  },
  {
    id: 'results',
    question: "How do we know it's working?",
    answer:
      "In the diagnostic we measure how long each process takes today. After go-live we compare the same numbers, such as hours spent, errors and response times. If an automation doesn't pay for itself, we tell you.",
  },
  {
    id: 'where',
    question: 'Do you work with companies outside Singapore?',
    answer:
      'Yes. We work remotely with companies in Singapore, Spain and elsewhere, in English or Spanish. Prices on this site are in Singapore dollars; the Spanish version shows prices for Spain in euros.',
  },
  {
    id: 'start',
    question: 'How do we start?',
    answer: `Book a diagnostic with the form on this page or write to ${PUBLIC_EMAIL}. We reply personally, agree the scope on a short call and, one to two weeks later, you have a costed plan. If you go ahead within 60 days, the diagnostic fee is credited to the project.`,
  },
] satisfies readonly FaqItem[];
