// The open conversation's id lives in memory only, so a reload starts a new
// session and nothing is written to the browser. The contact form reads it to
// link an enquiry to the conversation that led to it.
let current: string | null = null;

export function getChatSessionId(): string | null {
  return current;
}

export function setChatSessionId(id: string | null): void {
  current = id;
}
