import { afterEach, describe, expect, it, vi } from 'vitest';
import { getItem, removeItem, setItem } from '@/lib/local-store';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function brokenStorage() {
  const fail = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  vi.stubGlobal('localStorage', {
    getItem: fail,
    setItem: fail,
    removeItem: fail,
  });
}

describe('local-store', () => {
  it('round-trips through localStorage', () => {
    setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(getItem('k')).toBe('v');
    removeItem('k');
    expect(getItem('k')).toBeNull();
  });

  it('keeps values in memory when storage throws, and never throws itself', () => {
    brokenStorage();
    expect(() => setItem('mem', 'v')).not.toThrow();
    expect(getItem('mem')).toBe('v');
    expect(() => removeItem('mem')).not.toThrow();
    expect(getItem('mem')).toBeNull();
  });
});
