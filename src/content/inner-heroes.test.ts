import { describe, expect, it } from 'vitest';
import { aboutPage as enAbout } from '@/content/en/about';
import { contactPage as enContact } from '@/content/en/contact';
import { pricingPage as enPricing } from '@/content/en/pricing';
import { servicesHub as enHub } from '@/content/en/services-hub';
import { aboutPage as esAbout } from '@/content/es/about';
import { contactPage as esContact } from '@/content/es/contact';
import { pricingPage as esPricing } from '@/content/es/pricing';
import { servicesHub as esHub } from '@/content/es/services-hub';

const PAGES = [
  ['en', enPricing, enAbout, enContact, enHub],
  ['es', esPricing, esAbout, esContact, esHub],
] as const;

// Over the cap, and awaiting the owner's screenshot sign-off: EN About's lead
// (25 words) and ES pricing's lead (26). Both are the approved existing copy.
const AWAITING_SIGNOFF: readonly string[] = [enAbout.lead, esPricing.lead];

function words(text: string): number {
  return text.trim().split(/\s+/).length;
}

describe.each(PAGES)(
  'inner page heroes (%s)',
  (_locale, pricing, about, contact, hub) => {
    it.each([
      ['pricing', pricing.lead],
      ['about', about.lead],
      ['contact', contact.lead],
      ['hub', hub.lead],
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
