import type { ConsentCopy } from '@/content/types';

// TODO(albert): review the banner and settings copy
export const consent: ConsentCopy = {
  title: 'Cookies on Zenet Labs',
  text: 'With your permission we use Google Analytics cookies to see how the site is used, and we remember how you found us. We store nothing optional until you choose.',
  policy: 'Cookies policy',
  reject: 'Reject all',
  accept: 'Accept all',
  settings: 'Settings',
  dialog: {
    title: 'Cookie settings',
    intro:
      'Choose what we may store in your browser. You can change this at any time with "Cookie settings" at the bottom of every page.',
    necessary: 'Strictly necessary',
    necessaryText: 'Remember this choice in your browser for 12 months.',
    alwaysOn: 'Always on',
    analytics: 'Analytics',
    analyticsText:
      'Google Analytics counts visits and the buttons people use, with cookies that last up to 13 months.',
    marketing: 'Marketing',
    marketingText:
      'Remember for 90 days how you first found us (landing page, referring site and campaign tags such as utm_source or gclid) and send it with an enquiry. It also lets Google use analytics data to measure advertising; we run no advertising tags today.',
    save: 'Save choices',
    close: 'Close',
  },
};
