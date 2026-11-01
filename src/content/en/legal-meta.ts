import type { PageMeta } from '@/content/types';

const cookies = {
  title: 'Cookies policy',
  metaTitle: 'Cookies policy | Zenet Labs AI consultancy',
  description:
    'Zenet Labs sets no analytics or advertising cookies. See which strictly necessary cookies Cloudflare may set, how Turnstile works and how to manage them.',
} satisfies PageMeta;

export const legalMeta = {
  privacy: {
    title: 'Privacy policy',
    metaTitle: 'Privacy policy | Zenet Labs AI consultancy',
    description:
      'How Zenet Labs (Zenet Technology Pte. Ltd.) collects, uses and protects the data you send through the contact form, and how to exercise your rights.',
  },
  cookies,
  cookiesAnalytics: {
    ...cookies,
    description:
      'How Zenet Labs uses cookies: Google Analytics only with your consent, cookieless Cloudflare Web Analytics, Turnstile, and how to change your choice.',
  },
} satisfies Record<'privacy' | 'cookies' | 'cookiesAnalytics', PageMeta>;
