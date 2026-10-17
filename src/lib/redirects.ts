import { defaultLocale, splitLocale } from '@/lib/i18n';

export const SITE_HOST = 'zenetlabs.com';

export const ALIAS_HOSTS: ReadonlySet<string> = new Set([
  'www.zenetlabs.com',
  'zenettech.com',
  'www.zenettech.com',
  'zenettechnology.com',
  'www.zenettechnology.com',
  'sabatemartinez.com',
  'www.sabatemartinez.com',
]);

const LEGACY_RENAMES: ReadonlyMap<string, string> = new Map([
  ['privacy', 'privacy-policy'],
  ['cookies', 'cookies-policy'],
]);

const LEGACY_HOME = new Set(['about-us']);

function stripDefaultLocale(pathname: string): string {
  if (pathname === '/en') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
}

export function mapLegacyPath(pathname: string): string {
  const path = stripDefaultLocale(pathname);
  const split = splitLocale(path);
  const localePrefix = split.locale === defaultLocale ? '' : `/${split.locale}`;
  const rest = split.rest.replace(/^\/+|\/+$/g, '');
  const home = localePrefix || '/';
  const [first = ''] = rest.split('/');

  if (first === 'blog' || LEGACY_HOME.has(rest)) return home;
  const renamed = LEGACY_RENAMES.get(rest);
  if (renamed) return `${localePrefix}/${renamed}`;
  return path;
}

export function redirectTarget(url: URL): string | null {
  const hostChange =
    ALIAS_HOSTS.has(url.hostname) ||
    (url.hostname === SITE_HOST && url.protocol === 'http:');
  const pathname = mapLegacyPath(url.pathname);
  if (!hostChange && pathname === url.pathname) return null;

  const target = new URL(url);
  if (hostChange) {
    target.protocol = 'https:';
    target.hostname = SITE_HOST;
    target.port = '';
  }
  target.pathname = pathname;
  return target.href;
}
