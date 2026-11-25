import { describe, expect, it } from 'vitest';
import { serviceIncludes as enIncludes } from '@/content/en/service-includes';
import { serviceIncludes as esIncludes } from '@/content/es/service-includes';
import type { ServiceId } from '@/content/types';
import { PRICING_PAGE } from '../../test/page-content';

const ROWS = [
  'diagnostic',
  'integration',
  'agent',
  'web',
  'training',
  'maintenance',
  'growth',
] as const satisfies readonly ServiceId[];

describe.each([
  ['en', enIncludes],
  ['es', esIncludes],
] as const)('service includes (%s)', (locale, includes) => {
  it.each(ROWS)('lists 3 to 5 items for %s', (row) => {
    const items = includes[row];
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);
    for (const item of items) expect(item.trim()).not.toBe('');
  });

  it.each(ROWS)('is what the pricing page includes for %s', (row) => {
    expect(PRICING_PAGE[locale].details[row].includes).toBe(includes[row]);
  });
});
