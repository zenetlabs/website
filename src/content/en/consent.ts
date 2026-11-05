import type { ConsentCopy } from '@/content/types';

// TODO(albert): review the banner and settings copy
export const consent: ConsentCopy = {
  title: 'Cookies on Zenet Labs',
  text: 'With your permission we use Google Analytics cookies to count visits and the buttons people use, and we remember how you first found us. We store nothing optional until you choose.',
  textShort:
    'With your OK we use Google Analytics cookies and remember how you first found us. Nothing optional is stored until you choose.',
  more: 'More info',
  less: 'Less info',
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
      'Google Analytics counts visits and the buttons people use, with cookies that last up to 13 months. Advertising signals stay off.',
    attribution: 'Attribution',
    attributionText:
      'Remember for 90 days how you first found us (landing page, referring site and campaign tags such as utm_source or gclid) and send it with an enquiry. It stays with us: Google never receives it, and all advertising signals stay off.',
    save: 'Save choices',
    close: 'Close',
  },
};
