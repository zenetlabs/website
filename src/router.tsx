import { createRouter } from '@tanstack/react-router';
import { localizedRewrite, type PageId } from '@/lib/page-registry';
import { routeTree } from '@/routeTree.gen';

export function getRouter() {
  return createRouter({
    routeTree,
    rewrite: localizedRewrite,
    scrollRestoration: true,
    defaultPreload: 'intent',
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
  interface StaticDataRouteOption {
    page?: PageId;
  }
}
