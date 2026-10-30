import { RunLog } from '@/components/run-log';
import { Container, EmphasisTitle } from '@/components/section';
import { EYEBROW, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

export function Hero({
  copy,
  runlog,
  locale,
}: {
  copy: HomeContent['hero'];
  runlog: HomeContent['runlog'];
  locale: Locale;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-0"
      />
      <Container className="relative grid gap-14 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-7">
          <p className={EYEBROW}>{copy.eyebrow}</p>
          <h1 className="mt-6 text-balance">
            <EmphasisTitle parts={copy.title} marker />
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-fg">{copy.lead}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a href={navHref(locale, CTA_TARGET)} className={PRIMARY_BUTTON}>
              {copy.primary}
            </a>
            <a
              href={pagePath(locale, 'pricing')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.secondary} →
            </a>
          </div>
          <p className={`mt-6 ${EYEBROW}`}>{copy.audience}</p>
        </div>
        <div className="lg:col-span-5">
          <RunLog copy={runlog} />
        </div>
      </Container>
    </section>
  );
}
