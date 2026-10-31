import { useHydrated } from '@tanstack/react-router';
import { lazy, Suspense, use } from 'react';
import type { ConsentCopy } from '@/content/types';
import { type Locale, useLocale } from '@/lib/i18n';

const PARTS =
  __GA4_ID__ === null
    ? null
    : {
        gaId: __GA4_ID__,
        Ui: lazy(() =>
          import('@/components/consent-ui').then((m) => ({
            default: m.ConsentUi,
          })),
        ),
        copy: {
          en: () => import('@/content/en/consent').then((m) => m.consent),
          es: () => import('@/content/es/consent').then((m) => m.consent),
        } satisfies Record<Locale, () => Promise<ConsentCopy>>,
      };

type Parts = NonNullable<typeof PARTS>;

const copies = new Map<Locale, Promise<ConsentCopy>>();

function loadCopy(parts: Parts, locale: Locale): Promise<ConsentCopy> {
  const cached = copies.get(locale);
  if (cached) return cached;
  const loading = parts.copy[locale]();
  copies.set(locale, loading);
  return loading;
}

function ConsentLoaded({ parts, locale }: { parts: Parts; locale: Locale }) {
  const copy = use(loadCopy(parts, locale));
  return <parts.Ui gaId={parts.gaId} copy={copy} locale={locale} />;
}

function ConsentHost({ parts }: { parts: Parts }) {
  const hydrated = useHydrated();
  const locale = useLocale();
  return hydrated ? (
    <Suspense fallback={null}>
      <ConsentLoaded parts={parts} locale={locale} />
    </Suspense>
  ) : null;
}

export function ConsentManager() {
  return PARTS === null ? null : <ConsentHost parts={PARTS} />;
}
