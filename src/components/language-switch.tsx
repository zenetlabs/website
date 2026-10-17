import { useLocation } from '@tanstack/react-router';
import {
  type Locale,
  localePath,
  locales,
  stripLocale,
  useMessages,
} from '@/lib/i18n';

const LABELS: Record<Locale, string> = { en: 'EN', es: 'ES' };

export function LanguageSwitch({
  locale,
  footer = false,
}: {
  locale: Locale;
  footer?: boolean;
}) {
  const messages = useMessages();
  const pathname = useLocation({ select: (location) => location.pathname });
  const search = useLocation({ select: (location) => location.searchStr });
  const base = stripLocale(pathname);

  return (
    <nav
      aria-label={footer ? messages.nav.languageFooter : messages.nav.language}
      className="inline-flex rounded-full border border-border p-0.5 font-mono text-xs"
    >
      {locales.map((target) => (
        <a
          key={target}
          href={`${localePath(target, base)}${search}`}
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
