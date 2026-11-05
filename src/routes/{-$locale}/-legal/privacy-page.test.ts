import { expect, it, vi } from 'vitest';
import { loadedPrivacyPage, loadPrivacyPage } from './privacy-page';

const chunk = vi.hoisted(() => ({ fail: true }));

vi.mock('./privacy-en', () => {
  if (chunk.fail) throw new Error('chunk failed');
  return { PrivacyEn: () => null };
});

it('retries a privacy chunk that failed to load', async () => {
  await expect(loadPrivacyPage('en')).rejects.toThrow();
  expect(loadedPrivacyPage('en')).toBeUndefined();
  chunk.fail = false;
  const page = await loadPrivacyPage('en');
  expect(loadedPrivacyPage('en')).toBe(page);
  expect(await loadPrivacyPage('en')).toBe(page);
});
