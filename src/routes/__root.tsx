import schibstedLatin from '@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2?url';
import {
  createRootRoute,
  HeadContent,
  Scripts,
  useHydrated,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { NotFound } from '@/components/not-found';
import { PageShell } from '@/components/page-shell';
import { consentDefaultsScripts } from '@/lib/consent-defaults';
import { hasNotFound } from '@/lib/current-page';
import { fontPreload } from '@/lib/font-preload';
import { localeFromPath, messages, useLocale, useMessages } from '@/lib/i18n';
import { originTrialMeta, SITE_NAME } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { THEME_COLOR } from '@/lib/theme-colors';
import appCss from '@/styles/app.css?url';

const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export const Route = createRootRoute({
  beforeLoad: ({ location }) => ({
    locale: localeFromPath(location.pathname),
  }),
  head: ({ match, matches }) => {
    const { meta, notFound } = messages[match.context.locale];
    const missing = hasNotFound(matches);
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: missing ? `${notFound.title} | ${SITE_NAME}` : meta.title },
        {
          name: 'description',
          content: missing ? notFound.description : meta.description,
        },
        ...(missing ? [{ name: 'robots', content: 'noindex' }] : []),
        ...originTrialMeta(SITE.webmcp.originTrialToken),
      ],
      links: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/icons/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/icons/favicon-16x16.png',
        },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'stylesheet', href: appCss },
        fontPreload(schibstedLatin),
      ],
    };
  },
  scripts: () => (__GA4_ID__ === null ? [] : consentDefaultsScripts()),
  shellComponent: RootDocument,
  notFoundComponent: RootNotFound,
});

function RootNotFound() {
  const locale = useLocale();
  return (
    <PageShell>
      <NotFound locale={locale} />
    </PageShell>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const { nav } = useMessages();
  const hydrated = useHydrated();

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content={THEME_COLOR} />
        {/* Controls that need JavaScript (the home desk's call and chat doors)
            are hidden from the first paint without it, so nothing shifts. */}
        <noscript>
          <style>{'[data-needs-js]{display:none}'}</style>
        </noscript>
      </head>
      <body data-hydrated={hydrated ? 'true' : undefined}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-input focus:bg-accent focus:px-4 focus:py-2.5 focus:font-semibold focus:text-accent-fg"
        >
          {nav.skip}
        </a>
        {children}
        {SITE.cfBeaconToken ? (
          <script
            defer
            src={BEACON_SRC}
            data-cf-beacon={JSON.stringify({ token: SITE.cfBeaconToken })}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  );
}
