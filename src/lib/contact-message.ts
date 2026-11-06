export const CONTACT_MESSAGE_MAX = 5000;

// The home desk's no-JS composer and its chips land on the contact page with
// the question in `?message=`. The router's search codec keeps it the raw
// string (`src/lib/search-codec.ts`), so it round-trips and SSR never 307s.
export function messageParam(search: Record<string, unknown>): string | null {
  const { message } = search;
  if (typeof message !== 'string') return null;
  const trimmed = message.trim().slice(0, CONTACT_MESSAGE_MAX);
  return trimmed === '' ? null : trimmed;
}
