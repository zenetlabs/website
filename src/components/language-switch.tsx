import { useLocation } from '@tanstack/react-router';
import { useCurrentPage } from '@/lib/current-page';
import { type Locale, locales, useMessages } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

const LABELS: Record<Locale, string> = { en: 'EN', es: 'ES' };

export function LanguageSwitch({
  locale,
  footer = false,
}: {
  locale: Locale;
  footer?: boolean;
}) {
  const messages = useMessages();
  const search = useLocation({ select: (location) => location.searchStr });
  const page = useCurrentPage();

  return (
    <nav
      aria-label={footer ? messages.nav.languageFooter : messages.nav.language}
      className="inline-flex rounded-full border border-border p-0.5 font-mono text-xs"
    >
      {locales.map((target) => (
        <a
          key={target}
          href={`${pagePath(target, page ?? 'home')}${page ? search : ''}`}
          hrefLang={target}
          lang={target}
          aria-current={target === locale ? 'page' : undefined}
          className="rounded-full px-2.5 py-2 sm:px-3 aria-[current=page]:bg-accent aria-[current=page]:text-accent-fg"
        >
          {LABELS[target]}
        </a>
      ))}
    </nav>
  );
}
