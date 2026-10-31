export function fontPreload(href: string) {
  return {
    rel: 'preload',
    as: 'font',
    type: 'font/woff2',
    href,
    crossOrigin: 'anonymous' as const,
  };
}
