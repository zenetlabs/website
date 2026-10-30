import type { MouseEvent } from 'react';
import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Container } from '@/components/section';
import { PRIMARY_BUTTON } from '@/components/ui';
import { useCurrentPage } from '@/lib/current-page';
import { type Locale, useMessages } from '@/lib/i18n';
import { CTA_TARGET, isCurrent, NAV, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

const LINK =
  'rounded-input px-3 py-2 text-sm font-medium text-muted-fg motion-safe:transition-colors motion-safe:duration-200 hover:text-fg aria-[current=page]:text-fg';

function closeMenu(event: MouseEvent<HTMLElement>) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const { nav } = useMessages();
  const home = pagePath(locale, 'home');
  const current = useCurrentPage();
  const cta = navHref(locale, CTA_TARGET);
  const links = NAV.map((item) => ({
    href: navHref(locale, item.target),
    label: nav[item.id],
    current: isCurrent(item.target, current),
  }));

  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-bg/85 backdrop-blur">
      <Container className="flex items-center justify-between gap-4 py-3">
        <a
          href={home}
          aria-label={nav.home}
          className="flex items-center gap-2.5 whitespace-nowrap rounded-input font-semibold"
        >
          <Logo />
          Zenet Labs
        </a>
        <nav aria-label={nav.primary} className="hidden items-center md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
              className={LINK}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch locale={locale} />
          <a href={cta} className={`${PRIMARY_BUTTON} max-lg:hidden`}>
            {nav.cta}
          </a>
          <details className="group md:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-input border border-border px-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
              {nav.menu}
            </summary>
            <nav
              aria-label={nav.primary}
              className="absolute inset-x-0 top-full grid gap-1 border-b border-hairline bg-bg px-6 py-4"
            >
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={link.current ? 'page' : undefined}
                  onClick={closeMenu}
                  className="rounded-input py-3 text-base font-medium"
                >
                  {link.label}
                </a>
              ))}
              <a
                href={cta}
                onClick={closeMenu}
                className={`${PRIMARY_BUTTON} mt-2`}
              >
                {nav.cta}
              </a>
            </nav>
          </details>
        </div>
      </Container>
    </header>
  );
}
