import { expect, it, vi } from 'vitest';
import { legalEntity } from '@/lib/content';

vi.mock('@/content/es/entity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/es/entity')>();
  return {
    ...actual,
    entity: {
      ...actual.entity,
      address: {
        streetAddress: 'Calle Ejemplo 1',
        postalCode: '08001',
        locality: 'Barcelona',
        country: 'ES',
      },
    },
  };
});

it('serves the Spanish entity to es once it has an address, and still English to en', () => {
  expect(legalEntity('es').legalName).toBe('Albert Sabaté Martínez');
  expect(legalEntity('en').legalName).toBe('Zenet Technology Pte. Ltd.');
});
