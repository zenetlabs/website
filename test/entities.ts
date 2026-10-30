import { entity as esEntity } from '@/content/es/entity';
import type { PostalAddress, PublishedEntity } from '@/content/types';

export const BARCELONA: PostalAddress = {
  streetAddress: 'Calle Ejemplo 1',
  postalCode: '08001',
  locality: 'Barcelona',
  country: 'ES',
};

export const FLIPPED: PublishedEntity = { ...esEntity, address: BARCELONA };
