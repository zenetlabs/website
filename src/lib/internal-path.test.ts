import { describe, expect, it } from 'vitest';
import { isInternalPath } from '@/lib/internal-path';

describe('isInternalPath', () => {
  it.each([
    '/internal',
    '/internal/',
    '/internal/leads',
    '/internal/leads.csv',
    '/internal/leads/0b3c5f4e-1111-4222-8333-444455556666',
    '/internal/whatever/else',
    '/Internal/Leads',
    '/INTERNAL',
    '/%69nternal/leads',
    '/internal%2Fleads',
    '/%49nternal',
    '/%69nternal/%E0%A4%A',
  ])('gates %s', (path) => {
    expect(isInternalPath(path)).toBe(true);
  });

  it.each([
    '/',
    '/es',
    '/privacy',
    '/internals',
    '/internality',
    '/api/lead',
    '/about/internal',
    '/%E0%A4%A',
    '/%E0%A4%A/internal',
  ])('leaves %s alone', (path) => {
    expect(isInternalPath(path)).toBe(false);
  });
});
