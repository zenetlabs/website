import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Container } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import { type Locale, localePath, useMessages } from '@/lib/i18n';

export function SiteFooter({ locale }: { locale: Locale }) {
  const { footer, nav } = useMessages();

  return (
    <footer className="border-t border-hairline">
      <Container className="grid gap-10 py-12 text-sm text-muted-fg md:grid-cols-[1fr_auto]">
        <div className="grid gap-4">
          <a
            href={localePath(locale, '/')}
            aria-label={nav.home}
            className="flex w-fit items-center gap-3 font-semibold text-fg"
          >
            <Logo />
            Zenet Labs
          </a>
          <p>
            {footer.legal} · {footer.uen} · {footer.address}
          </p>
          <p>{footer.founded}</p>
        </div>
        <div className="grid content-between justify-items-start gap-6 md:justify-items-end">
          <nav aria-label={nav.legal} className="flex gap-6">
            <a
              href={localePath(locale, '/privacy-policy')}
              className={TEXT_LINK}
            >
              {footer.privacy}
            </a>
            <a
              href={localePath(locale, '/cookies-policy')}
              className={TEXT_LINK}
            >
              {footer.cookies}
            </a>
          </nav>
          <LanguageSwitch locale={locale} footer />
        </div>
      </Container>
    </footer>
  );
}
