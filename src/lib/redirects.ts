import { splitLocale } from '@/lib/i18n';
import { type PageId, pageForSlug, pagePath } from '@/lib/page-registry';

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

const LEGACY_PAGES: ReadonlyMap<string, PageId> = new Map([
  ['/privacy-policy', 'privacy'],
  ['/cookies-policy', 'cookies'],
  ['/about-us', 'about'],
]);

function collapseLeadingSlashes(pathname: string): string {
  return pathname.replace(/^\/{2,}/, '/');
}

function stripDefaultLocale(pathname: string): string {
  let path = collapseLeadingSlashes(pathname);
  while (path === '/en' || path.startsWith('/en/')) {
    path = collapseLeadingSlashes(path === '/en' ? '/' : path.slice(3));
  }
  return path;
}

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '') || '/';
  }
  return pathname;
}

export function mapLegacyPath(pathname: string): string {
  const path = stripDefaultLocale(pathname);
  const { locale, rest } = splitLocale(path);
  const slug = `/${rest.replace(/^\/+|\/+$/g, '')}`;
  const [, first] = slug.split('/');

  const page =
    first === 'blog' ? 'home' : (LEGACY_PAGES.get(slug) ?? pageForSlug(slug));
  return page ? pagePath(locale, page) : path;
}

export function isOwnedHost(hostname: string): boolean {
  return (
    hostname === SITE_HOST ||
    ALIAS_HOSTS.has(hostname) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.zenetlabs.workers.dev')
  );
}

export function redirectTarget(url: URL): string | null {
  if (!isOwnedHost(url.hostname)) return null;
  const hostChange =
    ALIAS_HOSTS.has(url.hostname) ||
    (url.hostname === SITE_HOST && url.protocol === 'http:');
  const pathname = stripTrailingSlash(mapLegacyPath(url.pathname));
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
