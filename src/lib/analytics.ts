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
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: state(choice.analytics),
  };
}

export function analyticsLocation(href: string): string {
  const url = new URL(href);
  const kept = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.startsWith('utm_')) kept.append(key, value);
  }
  url.search = kept.toString();
  url.hash = '';
  return url.toString();
}

export function analyticsReferrer(referrer: string, origin: string): string {
  if (referrer === '') return '';
  try {
    const url = new URL(referrer);
    return url.origin === origin
      ? analyticsLocation(referrer)
      : `${url.origin}/`;
  } catch {
    return '';
  }
}

function gtagSrc(id: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
}

function isAnalyticsCookie(name: string): boolean {
  return (
    name === '_ga' ||
    name.startsWith('_ga_') ||
    name === '_gid' ||
    name.startsWith('_gat')
  );
}

function isAdCookie(name: string): boolean {
  return (
    name.startsWith('_gcl_') ||
    name.startsWith('_gac_') ||
    name === 'FPAU' ||
    name === 'FPGCL'
  );
}

export function cookieDomains(hostname: string): string[] {
  const labels = hostname.split('.');
  const last = Math.max(labels.length - 2, 0);
  return labels
    .slice(0, last + 1)
    .map((_, index) => labels.slice(index).join('.'));
}

async function cookieNames(): Promise<string[]> {
  const cookies = await cookieStore.getAll();
  return cookies.flatMap(({ name }) => (name === undefined ? [] : [name]));
}

async function deleteCookie(name: string, domains: string[]): Promise<void> {
  await Promise.allSettled([
    cookieStore.delete({ name }),
    ...domains.map((domain) => cookieStore.delete({ name, domain, path: '/' })),
  ]);
}

async function deleteGoogleCookies(withAnalytics: boolean): Promise<void> {
  if (typeof cookieStore === 'undefined') return;
  try {
    const domains = cookieDomains(location.hostname);
    const names = (await cookieNames()).filter(
      (name) => isAdCookie(name) || (withAnalytics && isAnalyticsCookie(name)),
    );
    await Promise.all(names.map((name) => deleteCookie(name, domains)));
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

let lastLocation: string | null = null;
let watching = false;

function sendPageView(gtag: Gtag): void {
  if (!window.zenetTracking) return;
  const here = analyticsLocation(location.href);
  if (here === lastLocation) return;
  gtag('set', {
    page_location: here,
    page_referrer:
      lastLocation ?? analyticsReferrer(document.referrer, location.origin),
    page_title: document.title,
  });
  lastLocation = here;
  gtag('event', 'page_view');
  if (pageForSlug(splitLocale(location.pathname).rest) === 'pricing') {
    gtag('event', 'pricing_view');
  }
}

function watchNavigation(gtag: Gtag): void {
  if (watching) return;
  watching = true;
  const later = () => {
    window.setTimeout(() => sendPageView(gtag), 100);
  };
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method];
    history[method] = (data, unused, url) => {
      original.call(history, data, unused, url);
      later();
    };
  }
  window.addEventListener('popstate', later);
}

function startMeasurement(id: string, gtag: Gtag): void {
  if (measuring) return;
  measuring = true;
  gtag('js', new Date());
  gtag('config', id, {
    cookie_expires: COOKIE_EXPIRES_SECONDS,
    send_page_view: false,
  });
  sendPageView(gtag);
  watchNavigation(gtag);
  loadGtag(id);
}

export function applyConsent(
  id: string,
  next: ConsentChoice,
  now: number,
  changed = true,
): void {
  if (next.attribution) captureFirstTouch(now);
  else clearFirstTouch();

  const gtag = window.gtag;
  if (!gtag) return;
  window[`ga-disable-${id}`] = !next.analytics;
  gtag('consent', 'update', consentSignals(next));
  window.zenetTracking = next.analytics;
  if (!next.analytics) void deleteGoogleCookies(true);
  else if (changed) void deleteGoogleCookies(false);
  if (next.analytics) startMeasurement(id, gtag);
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
    void deleteGoogleCookies(true);
    return;
  }
  applyConsent(id, stored, now, false);
}
