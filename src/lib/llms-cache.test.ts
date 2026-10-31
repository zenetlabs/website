import { describe, expect, it, vi } from 'vitest';

const control = vi.hoisted(() => ({ fail: true }));

vi.mock('@/content/load', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/content/load')>();
  return {
    ...actual,
    loadServicesHubContent: (
      ...args: Parameters<typeof actual.loadServicesHubContent>
    ) =>
      control.fail
        ? Promise.reject(new Error('content failed to load'))
        : actual.loadServicesHubContent(...args),
  };
});

describe('llmsResponse cache', () => {
  it('forgets a failed build so the next request retries', async () => {
    const { llmsResponse } = await import('@/lib/llms');
    await expect(llmsResponse('llms', undefined)).rejects.toThrow(
      'content failed to load',
    );
    control.fail = false;
    const retry = await llmsResponse('llms', undefined);
    expect(retry.status).toBe(200);
    const body = await retry.text();
    expect(body).toMatch(/^# Zenet Labs\n/);
    const cached = await llmsResponse('llms', undefined);
    expect(await cached.text()).toBe(body);
  });
});
