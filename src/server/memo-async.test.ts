import { describe, expect, it, vi } from 'vitest';
import { memoAsync } from '@/server/memo-async';

describe('memoAsync', () => {
  it('loads a key once and shares the result', async () => {
    const load = vi.fn(async (key: string) => key.toUpperCase());
    const memo = memoAsync(load);
    expect(await Promise.all([memo('a'), memo('a'), memo('b')])).toEqual([
      'A',
      'A',
      'B',
    ]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('remembers a failure for the negative TTL, then tries again', async () => {
    let now = 0;
    const load = vi
      .fn<(key: string) => Promise<string>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue('up');
    const memo = memoAsync(load, { failureTtlMs: 30_000, now: () => now });
    await expect(memo('page')).rejects.toThrow('down');
    now = 29_000;
    await expect(memo('page')).rejects.toThrow('down');
    expect(load).toHaveBeenCalledTimes(1);
    now = 31_000;
    expect(await memo('page')).toBe('up');
    expect(load).toHaveBeenCalledTimes(2);
    expect(await memo('page')).toBe('up');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keys by the given function', async () => {
    const load = vi.fn(async (key: { a: number }) => key.a);
    const memo = memoAsync(load, { keyOf: (key) => `k${key.a}` });
    await memo({ a: 1 });
    await memo({ a: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });
});
