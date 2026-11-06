import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';

// Free text a visitor typed (the home desk's `?message=` on /contact) stays the
// raw string in both directions. The default codec reads `true`, `1.50` or a
// quoted word as JSON and writes it back differently, and SSR then answers 307
// with the question changed.
const RAW_KEYS: ReadonlySet<string> = new Set(['message']);

export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr);
  const raw = Object.fromEntries(
    [...RAW_KEYS].flatMap((key) => {
      const value = params.get(key);
      return value === null ? [] : [[key, value]];
    }),
  );
  return { ...defaultParseSearch(searchStr), ...raw };
}

export function stringifySearch(search: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(search)) {
    if (RAW_KEYS.has(key) && typeof value === 'string') {
      parts.push(new URLSearchParams({ [key]: value }).toString());
      continue;
    }
    const one = defaultStringifySearch({ [key]: value });
    if (one !== '') parts.push(one.slice(1));
  }
  return parts.length === 0 ? '' : `?${parts.join('&')}`;
}
