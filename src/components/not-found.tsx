import { Container } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import { type Locale, useMessages } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

export function NotFound({ locale }: { locale: Locale }) {
  const { notFound } = useMessages();

  return (
    <Container className="py-24">
      <h1>{notFound.title}</h1>
      <p className="mt-6 text-muted-fg">{notFound.description}</p>
      <a
        href={pagePath(locale, 'home')}
        className={`mt-8 inline-block ${TEXT_LINK}`}
      >
        {notFound.home}
      </a>
    </Container>
  );
}
