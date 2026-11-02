import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { TEXT_LINK } from '@/components/ui';
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
  const { ground, bg, pad } = sectionFrame('notice');

  return (
    <section
      id="verifactu"
      aria-labelledby="verifactu-title"
      data-ground={ground}
      className={bg}
    >
      <Container className={pad}>
        <h2 id="verifactu-title" className="max-w-3xl text-h2-compact">
          <EmphasisTitle parts={copy.title} />
        </h2>
        <div className="mt-5 grid gap-3 text-fg-soft md:grid-cols-2 md:gap-x-10">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <a
            href={pagePath(locale, 'verifactu')}
            className={`font-medium ${TEXT_LINK}`}
          >
            {copy.cta} →
          </a>
          <p className="text-sm text-fg-soft">{copy.checked}</p>
        </div>
      </Container>
    </section>
  );
}
