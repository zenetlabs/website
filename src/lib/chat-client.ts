import {
  type ChatEvent,
  type ChatFailure,
  type ChatRequestBody,
  isChatEvent,
  isChatFailure,
} from '@/lib/chat-events';

type ChatResponse =
  | { ok: true; events: AsyncGenerator<ChatEvent, void, void> }
  | ChatFailure;

const UNAVAILABLE: ChatFailure = { ok: false, error: 'unavailable' };
const NEWLINE = /\r?\n/;

function parseLine(line: string): ChatEvent | null {
  try {
    const value: unknown = JSON.parse(line);
    return isChatEvent(value) ? value : null;
  } catch {
    return null;
  }
}

// Lines are split across chunks; an unknown or malformed line is skipped, and
// a stream that ends without `done` or breaks mid-way ends with an error event.
async function* read(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatEvent, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let finished = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split(NEWLINE);
      pending = done ? '' : (lines.pop() ?? '');
      for (const line of lines) {
        const event = line === '' ? null : parseLine(line);
        if (event === null) continue;
        if (event.t === 'done') finished = true;
        yield event;
      }
      if (done) break;
    }
  } catch {
    // A dropped connection is handled below, like a stream that ended early.
  } finally {
    reader.releaseLock();
  }
  if (!finished) yield { t: 'error', code: 'unavailable' };
}

export async function postChat(
  body: ChatRequestBody,
  signal: AbortSignal,
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    const type = response.headers.get('content-type') ?? '';
    if (response.ok && response.body && type.includes('application/x-ndjson')) {
      return { ok: true, events: read(response.body) };
    }
    if (response.status === 429 && !type.includes('application/json')) {
      return { ok: false, error: 'rate' };
    }
    const failure: unknown = await response.json().catch(() => undefined);
    return isChatFailure(failure) ? failure : UNAVAILABLE;
  } catch {
    return UNAVAILABLE;
  }
}
