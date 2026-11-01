import { describe, expect, it } from 'vitest';
import { failureCodeOf } from '@/server/fetch-error';

describe('failureCodeOf', () => {
  it('names timeouts and aborts', () => {
    expect(failureCodeOf(new DOMException('slow', 'TimeoutError'))).toBe(
      'timeout',
    );
    expect(failureCodeOf(new DOMException('stop', 'AbortError'))).toBe(
      'timeout',
    );
  });

  it('calls everything else a network failure', () => {
    expect(failureCodeOf(new TypeError('offline'))).toBe('network');
    expect(failureCodeOf('boom')).toBe('network');
    expect(failureCodeOf(undefined)).toBe('network');
  });
});
