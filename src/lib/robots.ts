import { SITE } from '@/lib/site';

const SITE_HOST = new URL(SITE.url).host;
const CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'PerplexityBot',
  'Google-Extended',
  '*',
];
const ROBOTS_BLOCKED = 'User-agent: *\nDisallow: /\n';
const ROBOTS_ALLOWED = `${CRAWLERS.map((agent) => `User-agent: ${agent}`).join('\n')}\nAllow: /\nDisallow: /api/\nDisallow: /internal/\nDisallow: /_serverFn/\n\nSitemap: ${SITE.url}/sitemap.xml\n`;

export function robotsTxt(requestHost: string): string {
  return requestHost === SITE_HOST ? ROBOTS_ALLOWED : ROBOTS_BLOCKED;
}
