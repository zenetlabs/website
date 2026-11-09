import { describe, expect, it } from 'vitest';
import { BUILDS, PAGE_FLOWS } from '@/lib/offer-flows';
import { SERVICE_PAGE_IDS } from '@/lib/page-registry';

describe('offer flows', () => {
  it('draws a flow for every hub card and nothing else', () => {
    expect(Object.keys(PAGE_FLOWS).sort()).toEqual(
      SERVICE_PAGE_IDS.filter(
        (page) => page !== 'diagnostic' && page !== 'maintenance',
      ).sort(),
    );
  });

  it('takes the builds from the page map', () => {
    expect(BUILDS.map(({ flow }) => flow)).toEqual([
      PAGE_FLOWS.integrations,
      PAGE_FLOWS.software,
      PAGE_FLOWS.agents,
    ]);
  });
});
