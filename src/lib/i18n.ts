import { useRouteContext } from '@tanstack/react-router';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const prefixedLocales = locales.filter(
  (locale) => locale !== defaultLocale,
);

export function localeFromParam(param: string | undefined): Locale | undefined {
  return param === undefined
    ? defaultLocale
    : prefixedLocales.find((locale) => locale === param);
}

export function otherLocale(locale: Locale): Locale {
  return locales.find((candidate) => candidate !== locale) ?? locale;
}

export function splitLocale(pathname: string): {
  locale: Locale;
  rest: string;
} {
  const [, first] = pathname.split('/');
  const locale = prefixedLocales.find((candidate) => candidate === first);
  if (!locale) return { locale: defaultLocale, rest: pathname };
  return { locale, rest: pathname.slice(locale.length + 1) || '/' };
}

export function localeFromPath(pathname: string): Locale {
  return splitLocale(pathname).locale;
}

export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

export const messages: Record<Locale, typeof en> = { en, es };

export function useLocale(): Locale {
  return useRouteContext({
    from: '__root__',
    select: (context) => context.locale,
  });
}

export function useMessages(): typeof en {
  return messages[useLocale()];
}
