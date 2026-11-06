import { describe, expect, it } from 'vitest';
import type { SiteFlags } from '@/lib/page-registry';
import { pagePath } from '@/lib/page-registry';
import { relatedPage } from '@/server/chat/related-page';

const SITE: SiteFlags = {
  calculator: { published: false },
  booking: { published: true },
};

describe('relatedPage', () => {
  it.each([
    ['¿Conectáis Holded con PrestaShop?', 'holdedPrestashop'],
    ['Usamos HubSpot y Holded', 'holdedHubspot'],
    ['holded + woocommerce', 'holdedWoocommerce'],
    ['¿Qué es Verifactu y desde cuándo es obligatorio?', 'verifactu'],
  ] as const)('links %j to %s on the Spanish site', (message, page) => {
    expect(relatedPage(message, 'es', SITE)).toEqual({
      page,
      href: pagePath('es', page),
    });
  });

  it('needs every word of a pair, and a page published in the locale', () => {
    expect(relatedPage('¿Usáis Holded?', 'es', SITE)).toBeNull();
    expect(relatedPage('PrestaShop to Holded?', 'en', SITE)).toBeNull();
    expect(relatedPage('How much is an agent?', 'en', SITE)).toBeNull();
  });
});
