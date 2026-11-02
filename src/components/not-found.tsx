import { Container } from '@/components/section';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { type Locale, useMessages } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

const LINKS = ['services', 'pricing'] as const;

export function NotFound({ locale }: { locale: Locale }) {
  const { notFound, nav } = useMessages();

  return (
    <Container className="py-20 md:py-28">
      <h1 className="text-display-2">{notFound.title}</h1>
      <p className="mt-6 max-w-[60ch] text-lead text-fg-soft">
        {notFound.description}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
        <a href={pagePath(locale, 'home')} className={PRIMARY_BUTTON}>
          {notFound.home}
        </a>
        {LINKS.map((page) => (
          <a
            key={page}
            href={pagePath(locale, page)}
            className={`font-medium ${TEXT_LINK}`}
          >
            {nav[page]}
          </a>
        ))}
      </div>
    </Container>
  );
}
