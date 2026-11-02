import { Container, EmphasisTitle } from '@/components/section';
import { CARD, PROSE, TEXT_LINK } from '@/components/ui';
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
      data-ground="paper"
    >
      <Container className="py-12 md:py-16">
        <div className={`${CARD} p-8 md:p-10`}>
          <h2 id="verifactu-title" className="max-w-3xl text-h2-compact">
            <EmphasisTitle parts={copy.title} />
          </h2>
          <div className={`mt-6 grid gap-4 ${PROSE}`}>
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
