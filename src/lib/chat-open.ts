// The bridge from the home desk to the chat launcher: the desk asks for the
// panel (with the visitor's first message and where it should grow from) and
// the launcher, the only owner of the panel, reads the request. The panel and
// the AI client stay lazy; this module is a few lines in the entry graph.

// `from` is the element the panel grows out of (the desk); the panel measures
// it when it opens and again when it closes, so a scrolled page still matches.
export type ChatRequest = {
  id: number;
  message: string | null;
  from: Element | null;
};

let request: ChatRequest | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeChatRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function chatRequest(): ChatRequest | null {
  return request;
}

export function noChatRequest(): null {
  return null;
}

export function requestChat(
  message: string | null,
  from: Element | null,
): void {
  request = {
    id: nextId,
    message: message === null || message.trim() === '' ? null : message.trim(),
    from,
  };
  nextId += 1;
  emit();
}

export function clearChatRequest(): void {
  if (request === null) return;
  request = null;
  emit();
}
