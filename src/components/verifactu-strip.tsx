import { Container, EmphasisTitle } from '@/components/section';
import { CARD, EYEBROW, TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

export function VerifactuStrip({
  copy,
  locale,
}: {
  copy: NonNullable<HomeContent['verifactu']>;
  locale: Locale;
}) {
  return (
    <section
      id="verifactu"
      aria-labelledby="verifactu-title"
      className="border-t border-hairline"
    >
      <Container className="py-12 md:py-16">
        <div className={`${CARD} p-8 md:p-10`}>
          <p className={EYEBROW}>{copy.eyebrow}</p>
          <h2 id="verifactu-title" className="mt-4 max-w-3xl text-balance">
            <EmphasisTitle parts={copy.title} />
          </h2>
          <div className="mt-6 grid max-w-3xl gap-4 text-muted-fg">
            {copy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a
              href={pagePath(locale, 'verifactu')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.cta} →
            </a>
            <p className="text-sm text-muted-fg">{copy.checked}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
