import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadDeskClose,
  loadHoldedPairContent,
  loadSectorContent,
  loadServicePageContent,
  loadVerifactuContent,
} from '@/content/load';
import { locales } from '@/lib/i18n';
import { SERVICE_PAGE_IDS, serviceOf } from '@/lib/page-registry';
import { INCLUDES } from '../../test/inner-content';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadDeskClose', () => {
  it.each(locales)(
    'drops both call entries while voice is off (%s)',
    async (locale) => {
      vi.stubGlobal('__VOICE__', false);
      const close = await loadDeskClose(locale);
      expect(close.desk).not.toHaveProperty('call');
      expect(close.doors).not.toHaveProperty('call');
      expect(close.doors.write.title).not.toBe('');
      expect(close.human).not.toBe('');
    },
  );

  it.each(locales)('keeps them while voice is on (%s)', async (locale) => {
    vi.stubGlobal('__VOICE__', true);
    const close = await loadDeskClose(locale);
    expect(close.desk.call).toBeDefined();
    expect(close.doors.call).toBeDefined();
  });
});

describe('what a page loads with its copy', () => {
  it.each(SERVICE_PAGE_IDS)(
    'gives %s the includes of its ladder row and the desk close',
    async (page) => {
      const { includes, close } = await loadServicePageContent('en', page);
      expect(includes).toBe(INCLUDES.en[serviceOf(page)]);
      expect(close.doors.write).toBeDefined();
    },
  );

  it('gives automation and every Spanish landing the integration row', async () => {
    expect((await loadServicePageContent('es', 'automation')).includes).toBe(
      INCLUDES.es.integration,
    );
    const landings = await Promise.all([
      loadHoldedPairContent('holdedWoocommerce'),
      loadVerifactuContent(),
      loadSectorContent(),
    ]);
    for (const { includes } of landings) {
      expect(includes).toBe(INCLUDES.es.integration);
    }
  });
});
