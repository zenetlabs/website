import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Container } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import {
  formatAddress,
  foundedLine,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { type Locale, useMessages } from '@/lib/i18n';
import { hasLocale, type PageId, pagePath } from '@/lib/page-registry';

const LEGAL_LINKS = [
  'legalNotice',
  'privacy',
  'cookies',
] as const satisfies readonly PageId[];

export function SiteFooter({ locale }: { locale: Locale }) {
  const { footer, nav } = useMessages();
  const entity = legalEntity(locale);
  const founded = foundedLine(entity, locale);

  return (
    <footer className="border-t border-hairline">
      <Container className="grid gap-10 py-12 text-sm text-muted-fg md:grid-cols-[1fr_auto]">
        <div className="grid gap-4">
          <a
            href={pagePath(locale, 'home')}
            aria-label={nav.home}
            className="flex w-fit items-center gap-3 font-semibold text-fg"
          >
            <Logo />
            Zenet Labs
          </a>
          <p>
            © {entity.legalName} · {taxIdLabel(entity)} ·{' '}
            {formatAddress(entity.address, locale)}
          </p>
          {founded && <p>{founded}</p>}
        </div>
        <div className="grid content-between justify-items-start gap-6 md:justify-items-end">
          <nav
            aria-label={nav.legal}
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {LEGAL_LINKS.filter((page) => hasLocale(page, locale)).map(
              (page) => (
                <a
                  key={page}
                  href={pagePath(locale, page)}
                  className={TEXT_LINK}
                >
                  {footer[page]}
                </a>
              ),
            )}
          </nav>
          <LanguageSwitch locale={locale} footer />
        </div>
      </Container>
    </footer>
  );
}
