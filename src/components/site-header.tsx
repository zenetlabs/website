import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { CtaLink } from '@/components/cta-link';
import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Container } from '@/components/section';
import { PRIMARY_BUTTON_FULL, SECONDARY_BUTTON_SM } from '@/components/ui';
import { useCurrentPage } from '@/lib/current-page';
import { type Locale, useMessages } from '@/lib/i18n';
import { CTA_TARGET, isCurrent, NAV, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

function closeMenu(event: MouseEvent<HTMLElement>) {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  if (event.key !== 'Escape' || !event.currentTarget.open) return;
  event.currentTarget.open = false;
  event.currentTarget.querySelector('summary')?.focus();
}

// Focus never wanders behind the open menu: leaving it closes it.
function closeOnFocusOut(event: FocusEvent<HTMLDetailsElement>) {
  const next = event.relatedTarget;
  if (next instanceof Node && !event.currentTarget.contains(next)) {
    event.currentTarget.open = false;
  }
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
    <header className="sticky top-0 z-30 border-b border-hairline bg-bg">
      <Container className="flex h-(--header-h) items-center gap-4 md:gap-6">
        <a
          href={home}
          aria-label={nav.home}
          className="flex min-h-11 shrink-0 items-center rounded-input"
        >
          <Logo />
        </a>
        <nav
          aria-label={nav.primary}
          className="hidden items-center gap-1 md:flex lg:ml-4"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
              className="nav-link"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitch locale={locale} className="max-md:hidden" />
          <CtaLink
            cta="header"
            href={cta}
            className={`${SECONDARY_BUTTON_SM} max-lg:hidden`}
          >
            {nav.cta}
          </CtaLink>
          <details
            className="md:hidden"
            onKeyDown={closeOnEscape}
            onBlur={closeOnFocusOut}
          >
            <summary className="menu-toggle">
              <span className="sr-only">{nav.menu}</span>
              <span aria-hidden="true" className="menu-bar" />
              <span aria-hidden="true" className="menu-bar" />
            </summary>
            <div className="menu-panel">
              <nav aria-label={nav.primary}>
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    aria-current={link.current ? 'page' : undefined}
                    onClick={closeMenu}
                    className="menu-link"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <CtaLink
                cta="header_menu"
                href={cta}
                onClick={closeMenu}
                className={`${PRIMARY_BUTTON_FULL} mt-8`}
              >
                {nav.cta}
              </CtaLink>
              <LanguageSwitch locale={locale} className="mt-4 -ml-3" />
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
