import { vi } from 'vitest';

export function navigationEntry(name: string | null) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue(
    name === null
      ? []
      : [
          {
            name,
            entryType: 'navigation',
            startTime: 0,
            duration: 0,
            toJSON: () => ({}),
          },
        ],
  );
}

export function setLocation(path: string) {
  window.history.replaceState(null, '', path);
}

export function setReferrer(referrer: string) {
  vi.spyOn(document, 'referrer', 'get').mockReturnValue(referrer);
}
