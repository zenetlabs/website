import type { LlmsCopy } from '@/content/types';

export const llms = {
  operator: 'This site is operated by {legalName} ({taxId}), {address}.',
  markdown:
    'Every page is also served as Markdown: add `.md` to its URL (the home page is {home}) or send `Accept: text/markdown`.',
  fullNote:
    'This file holds the full text of the English site, generated from the same content as its pages. The short index is {index}; the legal pages are listed under Pages.',
  headings: {
    services: 'Services',
    pages: 'Pages',
    faq: 'FAQ',
    portfolio: 'Portfolio',
    contact: 'Contact',
    pricing: 'Services and prices',
    problems: 'Problems we solve',
    process: 'How we work',
    cases: 'Cases',
    about: 'About Zenet Labs',
  },
  labels: {
    email: 'Email',
    form: 'Contact form',
    full: 'Full text',
    index: 'Index',
    otherLanguage: 'Versión en español',
  },
} satisfies LlmsCopy;
