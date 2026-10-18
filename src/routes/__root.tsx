import instrumentSerifItalic from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url';
import instrumentSerifLatin from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';
import {
  createRootRoute,
  HeadContent,
  Scripts,
  useHydrated,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { NotFound } from '@/components/not-found';
import { PageShell } from '@/components/page-shell';
import { localeFromPath, messages, useLocale, useMessages } from '@/lib/i18n';
import { SITE_NAME } from '@/lib/seo';
import { SITE } from '@/lib/site';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/theme-colors';
import appCss from '@/styles/app.css?url';

const FONT_PRELOADS = [instrumentSerifLatin, instrumentSerifItalic];
const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';

export const Route = createRootRoute({
  beforeLoad: ({ location }) => ({
    locale: localeFromPath(location.pathname),
  }),
  head: ({ match, matches }) => {
    const { meta, notFound } = messages[match.context.locale];
    const missing = matches.some(
      (entry) => entry.status === 'notFound' || entry._notFound === true,
    );
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: missing ? `${notFound.title} | ${SITE_NAME}` : meta.title },
        {
          name: 'description',
          content: missing ? notFound.description : meta.description,
        },
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
        ...FONT_PRELOADS.map((href) => ({
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href,
          crossOrigin: 'anonymous' as const,
        })),
      ],
    };
  },
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
        <meta
          name="theme-color"
          content={THEME_COLOR_LIGHT}
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content={THEME_COLOR_DARK}
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body data-hydrated={hydrated ? 'true' : undefined}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-input focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg"
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
