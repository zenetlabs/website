import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { useLocale } from '@/lib/i18n';

export function PageShell({ children }: { children: ReactNode }) {
  const locale = useLocale();

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main">{children}</main>
      <SiteFooter locale={locale} />
    </>
  );
}
