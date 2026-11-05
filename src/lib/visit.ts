import { ATTRIBUTION_LIMITS, isRelativePath } from '@/lib/lead-result';

export type Visit = { landing: string; referrer: string; page: string };

function relative(path: string, max: number): string {
  return isRelativePath(path) ? path.slice(0, max) : '';
}

// A booking link's token (?confirm=) must never be kept as the first-touch page.
const PRIVATE_PARAMS = ['confirm', 'outcome'];

function withoutPrivate(path: string): string {
  const query = path.indexOf('?');
  if (query < 0) return path;
  const params = new URLSearchParams(path.slice(query + 1));
  if (!PRIVATE_PARAMS.some((name) => params.has(name))) return path;
  for (const name of PRIVATE_PARAMS) params.delete(name);
  const rest = params.toString();
  return `${path.slice(0, query)}${rest === '' ? '' : `?${rest}`}`;
}

// A referrer from our own pages can be the confirm link itself.
function privateFreeReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    if (url.origin !== location.origin) return referrer;
    return `${url.origin}${withoutPrivate(url.pathname + url.search)}`;
  } catch {
    return referrer;
  }
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
    landing: relative(withoutPrivate(landing), ATTRIBUTION_LIMITS.landing),
    referrer: privateFreeReferrer(document.referrer).slice(
      0,
      ATTRIBUTION_LIMITS.referrer,
    ),
    page: relative(location.pathname, ATTRIBUTION_LIMITS.page) || '/',
  };
}
