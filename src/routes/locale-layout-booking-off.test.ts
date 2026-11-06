import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it, vi } from 'vitest';
import { hasNotFound } from '@/lib/current-page';
import { getRouter } from '@/router';

vi.mock('@/server/contact.functions', () => ({ sendContact: vi.fn() }));
vi.mock('@/lib/site', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/site')>();
  return {
    ...original,
    SITE: { ...original.SITE, booking: { published: false } },
  };
});

describe('{-$locale} layout with booking unpublished', () => {
  it.each(['/book', '/es/reservar'])('answers 404 for %s', async (path) => {
    const router = getRouter();
    router.update({
      history: createMemoryHistory({ initialEntries: [path] }),
    });
    await router.load();
    expect(hasNotFound(router.state.matches)).toBe(true);
  });
});
