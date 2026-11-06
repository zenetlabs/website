import { useLocation } from '@tanstack/react-router';
import { useCurrentPage } from '@/lib/current-page';
import { type Locale, locales, useMessages } from '@/lib/i18n';
import { switchHref } from '@/lib/page-registry';
import { track } from '@/lib/track';

const LABELS: Record<Locale, string> = { en: 'English', es: 'Español' };

// The header and the menu offer only the other language, named in itself; the
// footer lists both and marks the current one.
export function LanguageSwitch({
  locale,
  footer = false,
  className = '',
}: {
  locale: Locale;
  footer?: boolean;
  className?: string;
}) {
  const messages = useMessages();
  const search = useLocation({ select: (location) => location.searchStr });
  const page = useCurrentPage();
  const targets = footer
    ? locales
    : locales.filter((target) => target !== locale);

  return (
    <nav
      aria-label={footer ? messages.nav.languageFooter : messages.nav.language}
      className={`flex gap-x-1 ${className}`}
    >
      {targets.map((target) => (
        <a
          key={target}
          href={switchHref(target, page, search)}
          hrefLang={target}
          lang={target}
          aria-current={target === locale ? 'page' : undefined}
          onClick={
            target === locale ? undefined : () => track('language_switch')
          }
          className="nav-link"
        >
          {LABELS[target]}
        </a>
      ))}
    </nav>
  );
}
