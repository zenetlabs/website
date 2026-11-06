import { LanguageSwitch } from '@/components/language-switch';
import { Logo } from '@/components/logo';
import { Container } from '@/components/section';
import {
  formatAddress,
  foundedLine,
  legalEntity,
  taxIdLabel,
} from '@/lib/content';
import { openCookieSettings } from '@/lib/cookie-settings';
import { type Locale, useMessages } from '@/lib/i18n';
import { hasLocale, type PageId, pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

const LEGAL_LINKS = [
  'legalNotice',
  'privacy',
  'cookies',
] as const satisfies readonly PageId[];

const EXPLORE_LINKS = [
  'services',
  'pricing',
  'cases',
  'about',
  'contact',
] as const satisfies readonly PageId[];

export function SiteFooter({ locale }: { locale: Locale }) {
  const { footer, nav, meta } = useMessages();
  const entity = legalEntity(locale);
  const founded = foundedLine(entity, locale);

  return (
    <footer className="border-t border-hairline bg-tint">
      <Container className="grid gap-10 pt-14 pb-10 md:grid-cols-12 md:gap-6 md:pt-20">
        <div className="grid content-start gap-5 md:col-span-5">
          <a
            href={pagePath(locale, 'home')}
            aria-label={nav.home}
            className="flex min-h-11 w-fit items-center rounded-input"
          >
            <Logo />
          </a>
          <p className="max-w-[34em] text-ui-m text-fg-soft">
            {meta.description}
          </p>
          <a
            href={`mailto:${PUBLIC_EMAIL}`}
            className="w-fit text-ui-l font-semibold text-fg underline pointer-fine:hover:text-agent"
          >
            {PUBLIC_EMAIL}
          </a>
        </div>
        <nav
          aria-label={nav.explore}
          className="grid content-start md:col-span-3 md:col-start-7"
        >
          {EXPLORE_LINKS.map((page) => (
            <a key={page} href={pagePath(locale, page)} className="footer-link">
              {nav[page]}
            </a>
          ))}
        </nav>
        <div className="grid content-start gap-6 md:col-span-3">
          <nav aria-label={nav.legal} className="grid content-start">
            {LEGAL_LINKS.filter((page) => hasLocale(page, locale)).map(
              (page) => (
                <a
                  key={page}
                  href={pagePath(locale, page)}
                  className="footer-link"
                >
                  {footer[page]}
                </a>
              ),
            )}
            {__GA4_ID__ === null ? null : (
              <a
                href={pagePath(locale, 'cookies')}
                onClick={(event) => {
                  if (openCookieSettings()) event.preventDefault();
                }}
                className="footer-link"
              >
                {footer.cookieSettings}
              </a>
            )}
          </nav>
          <LanguageSwitch locale={locale} footer className="-ml-3" />
        </div>
        <div className="grid gap-1 border-t border-hairline pt-6 text-ui-s text-muted-fg md:col-span-12">
          <p>
            © {entity.legalName} · {taxIdLabel(entity)} ·{' '}
            {formatAddress(entity.address, locale)}
          </p>
          {founded && <p>{founded}</p>}
        </div>
      </Container>
    </footer>
  );
}
