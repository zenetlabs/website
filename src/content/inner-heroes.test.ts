import { describe, expect, it } from 'vitest';
import { aboutPage as enAbout } from '@/content/en/about';
import { viatsyCase as enCase } from '@/content/en/case-pages/viatsy';
import { casesHub as enCases } from '@/content/en/cases-hub';
import { contactPage as enContact } from '@/content/en/contact';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { servicesHub as enHub } from '@/content/en/services-hub';
import { aboutPage as esAbout } from '@/content/es/about';
import { viatsyCase as esCase } from '@/content/es/case-pages/viatsy';
import { casesHub as esCases } from '@/content/es/cases-hub';
import { contactPage as esContact } from '@/content/es/contact';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { servicesHub as esHub } from '@/content/es/services-hub';

const PAGES = [
  ['en', enPricing, enAbout, enContact, enHub, enCases, enCase],
  ['es', esPricing, esAbout, esContact, esHub, esCases, esCase],
] as const;

// Over the cap, and awaiting the owner's screenshot sign-off: EN About's lead
// (25 words) and ES pricing's lead (26). Both are the approved existing copy.
const AWAITING_SIGNOFF: readonly string[] = [enAbout.lead, esPricing.lead];

function words(text: string): number {
  return text.trim().split(/\s+/).length;
}

describe.each(PAGES)(
  'inner page heroes (%s)',
  (_locale, pricing, about, contact, hub, cases, viatsy) => {
    it.each([
      ['pricing', pricing.lead],
      ['about', about.lead],
      ['contact', contact.lead],
      ['hub', hub.lead],
      ['cases hub', cases.lead],
      ['Viatsy case', viatsy.lead],
    ])(
      'keeps the %s hero to one sentence of 24 words or fewer, with no price',
      (_page, lead) => {
        if (!AWAITING_SIGNOFF.includes(lead)) {
          expect(words(lead)).toBeLessThanOrEqual(24);
        }
        expect(lead.match(/[.!?](\s|$)/g)).toHaveLength(1);
        expect(lead).not.toMatch(/\d|[€$]/);
      },
    );

    it('keeps the sentences that left the heroes', () => {
      expect(contact.form.lead?.trim()).toBeTruthy();
      expect(hub.intro.trim()).toBeTruthy();
      expect(cases.intro.trim()).toBeTruthy();
      expect(viatsy.intro.trim()).toBeTruthy();
    });

    it('fills every ladder label', () => {
      for (const label of Object.values(hub.ladder)) {
        expect(label.trim()).not.toBe('');
      }
    });

    it('titles every "How pricing works" row', () => {
      expect(pricing.how.items).toHaveLength(4);
      for (const item of pricing.how.items) {
        expect(item.title.trim()).not.toBe('');
        expect(item.text.trim()).not.toBe('');
      }
    });
  },
);
