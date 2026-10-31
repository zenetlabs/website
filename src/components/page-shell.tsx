import type { ReactNode } from 'react';
import { ConsentManager } from '@/components/consent-manager';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useLocale } from '@/lib/i18n';

export function PageShell({ children }: { children: ReactNode }) {
  const locale = useLocale();

  return (
    <>
      <ConsentManager />
      <SiteHeader locale={locale} />
      <main id="main" tabIndex={-1} className="outline-hidden">
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
