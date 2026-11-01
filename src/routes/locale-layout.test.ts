import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { hasNotFound } from '@/lib/current-page';
import { getRouter } from '@/router';

vi.mock('@/server/contact.functions', () => ({ sendContact: vi.fn() }));

async function load(path: string) {
  const router = getRouter();
  router.update({
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return router.state.matches;
}

describe('{-$locale} layout', () => {
  it.each([
    '/',
    '/pricing',
    '/about',
    '/privacy',
    '/es',
    '/es/precios',
    '/es/sobre-nosotros',
    '/es/privacidad',
    '/es/aviso-legal',
  ])('serves %s', async (path) => {
    expect(hasNotFound(await load(path))).toBe(false);
  });

  it.each(['/pricing/calculator', '/es/precios/calculadora'])(
    'answers 404 for %s while the calculator is unpublished',
    async (path) => {
      expect(hasNotFound(await load(path))).toBe(true);
    },
  );

  it.each(['/legal-notice', '/fr/privacy'])(
    'answers 404 for %s',
    async (path) => {
      expect(hasNotFound(await load(path))).toBe(true);
    },
  );
});
