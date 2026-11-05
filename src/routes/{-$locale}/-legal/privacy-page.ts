import type { ReactElement } from 'react';
import type { PublishedEntity } from '@/content/types';
import type { Locale } from '@/lib/i18n';

// One locale's privacy page per chunk: the loader awaits it (server and client
// navigations), and a hydrating client suspends on it inside a Suspense boundary.
type PrivacyPage = (props: {
  title: string;
  entity: PublishedEntity;
}) => ReactElement;

const IMPORTS: Record<Locale, () => Promise<PrivacyPage>> = {
  en: () => import('./privacy-en').then((module) => module.PrivacyEn),
  es: () => import('./privacy-es').then((module) => module.PrivacyEs),
};

const loaded: Partial<Record<Locale, PrivacyPage>> = {};
const pending: Partial<Record<Locale, Promise<PrivacyPage>>> = {};

export function loadPrivacyPage(locale: Locale): Promise<PrivacyPage> {
  const started =
    pending[locale] ??
    IMPORTS[locale]().then(
      (page) => {
        loaded[locale] = page;
        return page;
      },
      (error: unknown) => {
        delete pending[locale];
        throw error;
      },
    );
  pending[locale] = started;
  return started;
}

export function loadedPrivacyPage(locale: Locale): PrivacyPage | undefined {
  return loaded[locale];
}
