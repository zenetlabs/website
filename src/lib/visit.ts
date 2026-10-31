import { ATTRIBUTION_LIMITS, isRelativePath } from '@/lib/lead-result';

export type Visit = { landing: string; referrer: string; page: string };

function relative(path: string, max: number): string {
  return isRelativePath(path) ? path.slice(0, max) : '';
}

export function currentVisit(): Visit {
  let landing = location.pathname + location.search;
  const [navigation] = performance.getEntriesByType('navigation');
  if (navigation) {
    try {
      const url = new URL(navigation.name);
      landing = url.pathname + url.search;
    } catch {
      // Keep the current location.
    }
  }
  return {
    landing: relative(landing, ATTRIBUTION_LIMITS.landing),
    referrer: document.referrer.slice(0, ATTRIBUTION_LIMITS.referrer),
    page: relative(location.pathname, ATTRIBUTION_LIMITS.page) || '/',
  };
}
