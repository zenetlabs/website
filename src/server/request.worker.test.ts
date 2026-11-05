import { describe, expect, it } from 'vitest';
import {
  DRAIN_LIMIT_BYTES,
  drainUnreadBody,
  readCapped,
} from '@/server/request';

const URL_ = 'https://zenetlabs.com/api/tools/get_pricing';

// A body that counts what it hands out and whether it was cancelled.
function counted(total: number, chunk = 4096) {
  const seen = { delivered: 0, cancelled: false };
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (seen.delivered >= total) {
        controller.close();
        return;
      }
      const size = Math.min(chunk, total - seen.delivered);
      seen.delivered += size;
      controller.enqueue(new Uint8Array(size));
    },
    cancel() {
      seen.cancelled = true;
    },
  });
  return { seen, stream };
}

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', ...headers },
    body,
  });
}

describe('drainUnreadBody in workerd', () => {
  it('reads a body the handler left unread to the end', async () => {
    const { seen, stream } = counted(20_000);
    const request = post(stream);
    expect(request.bodyUsed).toBe(false);
    await drainUnreadBody(request);
    expect(request.bodyUsed).toBe(true);
    expect(seen).toEqual({ delivered: 20_000, cancelled: false });
  });

  it('stops at the cap and cancels the rest', async () => {
    const { seen, stream } = counted(10_000_000);
    await drainUnreadBody(post(stream));
    expect(seen.cancelled).toBe(true);
    expect(seen.delivered).toBeLessThanOrEqual(DRAIN_LIMIT_BYTES + 8192);
  });

  it('cancels a body declared over the cap without reading it', async () => {
    const { seen, stream } = counted(1_000_000);
    const request = post(stream, { 'Content-Length': '1000000' });
    await drainUnreadBody(request);
    expect(seen.cancelled).toBe(true);
    // At most the one chunk a stream pulls by itself when it is made.
    expect(seen.delivered).toBeLessThanOrEqual(4096);
  });

  it('leaves a body that was read, one that is locked, and a request without one', async () => {
    const read = post('{}');
    await read.text();
    await expect(drainUnreadBody(read)).resolves.toBeUndefined();

    const { seen, stream } = counted(20_000);
    const locked = post(stream);
    const reader = locked.body?.getReader();
    await drainUnreadBody(locked);
    expect(seen.cancelled).toBe(false);
    expect(locked.body?.locked).toBe(true);
    await reader?.cancel();

    const empty = new Request('https://zenetlabs.com/');
    await drainUnreadBody(empty);
    expect(empty.bodyUsed).toBe(false);
  });
});

describe('readCapped in workerd', () => {
  it('reads a body under the cap and cancels one past it', async () => {
    expect(await readCapped(post('{"a":1}'), 100)).toBe('{"a":1}');
    const { seen, stream } = counted(50_000);
    expect(await readCapped(post(stream), 10_000)).toBeNull();
    expect(seen.cancelled).toBe(true);
    expect(seen.delivered).toBeLessThanOrEqual(10_000 + 4096);
  });

  it('refuses a declared length over the cap without reading', async () => {
    const { seen, stream } = counted(50_000);
    expect(
      await readCapped(post(stream, { 'Content-Length': '50000' }), 10_000),
    ).toBeNull();
    // At most the one chunk a stream pulls by itself when it is made.
    expect(seen.delivered).toBeLessThanOrEqual(4096);
  });
});
