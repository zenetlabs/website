import { SITE } from '@/lib/site';

const SITE_HOST = new URL(SITE.url).host;
const ROBOTS_BLOCKED = 'User-agent: *\nDisallow: /\n';
const ROBOTS_ALLOWED = `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`;

export function robotsTxt(requestHost: string): string {
  return requestHost === SITE_HOST ? ROBOTS_ALLOWED : ROBOTS_BLOCKED;
}
