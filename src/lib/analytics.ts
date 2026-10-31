import {
  CONSENT_KEY,
  type ConsentChoice,
  pruneConsent,
  REJECT_ALL,
  readConsent,
} from '@/lib/consent';
import { captureFirstTouch, clearFirstTouch } from '@/lib/first-touch';
import { splitLocale } from '@/lib/i18n';
import { pageForSlug } from '@/lib/page-registry';
import type { ConsentSignals, Gtag } from '@/lib/track';

const COOKIE_EXPIRES_SECONDS = 34_128_000;
let measuring = false;

function state(granted: boolean): ConsentSignals['ad_storage'] {
  return granted ? 'granted' : 'denied';
}

export function consentSignals(choice: ConsentChoice): ConsentSignals {
  return {
    ad_storage: state(choice.marketing),
    ad_user_data: state(choice.marketing),
    ad_personalization: state(choice.marketing),
    analytics_storage: state(choice.analytics),
  };
}

function gtagSrc(id: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
}

function isGoogleCookie(name: string): boolean {
  return name === '_ga' || name.startsWith('_ga_') || name.startsWith('_gcl_');
}

function cookieDomains(): string[] {
  const { hostname } = location;
  const labels = hostname.split('.');
  const parent = labels.length > 2 ? `.${labels.slice(-2).join('.')}` : null;
  return [hostname, `.${hostname}`, ...(parent ? [parent] : [])];
}

async function deleteGoogleCookies(): Promise<void> {
  if (typeof cookieStore === 'undefined') return;
  try {
    const cookies = await cookieStore.getAll();
    const names = cookies.flatMap(({ name }) =>
      name !== undefined && isGoogleCookie(name) ? [name] : [],
    );
    await Promise.allSettled(
      names.flatMap((name) => [
        cookieStore.delete({ name }),
        ...cookieDomains().map((domain) =>
          cookieStore.delete({ name, domain, path: '/' }),
        ),
      ]),
    );
  } catch {
    // Best effort: without gtag.js the cookies are inert.
  }
}

function loadGtag(id: string): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = gtagSrc(id);
  document.head.appendChild(script);
}

function startMeasurement(id: string, gtag: Gtag): void {
  if (measuring) return;
  measuring = true;
  gtag('js', new Date());
  gtag('config', id, { cookie_expires: COOKIE_EXPIRES_SECONDS });
  if (pageForSlug(splitLocale(location.pathname).rest) === 'pricing') {
    gtag('event', 'pricing_view');
  }
  loadGtag(id);
}

export function applyConsent(
  id: string,
  next: ConsentChoice,
  now: number,
): void {
  if (next.marketing) captureFirstTouch(now);
  else clearFirstTouch();

  const gtag = window.gtag;
  if (!gtag) return;
  window[`ga-disable-${id}`] = !next.analytics;
  gtag('consent', 'update', consentSignals(next));
  window.zenetTracking = next.analytics;
  if (next.analytics) startMeasurement(id, gtag);
  else void deleteGoogleCookies();
}

export function startAnalytics(id: string, now: number): void {
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) {
      applyConsent(id, readConsent() ?? REJECT_ALL, Date.now());
    }
  });
  pruneConsent(now);
  const stored = readConsent();
  if (stored === null) {
    clearFirstTouch();
    return;
  }
  applyConsent(id, stored, now);
}
