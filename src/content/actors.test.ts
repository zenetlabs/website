import { describe, expect, it } from 'vitest';
import { home as enHome } from '@/content/en/home';
import { servicesHub as enHub } from '@/content/en/services-hub';
import { home as esHome } from '@/content/es/home';
import { servicesHub as esHub } from '@/content/es/services-hub';

describe('flow actor names', () => {
  it.each([
    ['en', enHome, enHub],
    ['es', esHome, esHub],
  ] as const)(
    'match between home and the services hub (%s)',
    (_locale, home, hub) => {
      expect(hub.labels.actors).toEqual(home.cases.actors);
    },
  );
});
