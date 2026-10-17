import { RunLog } from '@/components/run-log';
import { Container, EmphasisTitle } from '@/components/section';
import { EYEBROW, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { localePath, useLocale, useMessages } from '@/lib/i18n';

export function Hero() {
  const { hero } = useMessages();
  const home = localePath(useLocale(), '/');

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="dot-grid pointer-events-none absolute inset-0"
      />
      <Container className="relative grid gap-14 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-7">
          <p className={EYEBROW}>{hero.eyebrow}</p>
          <h1 className="mt-6 text-balance">
            <EmphasisTitle parts={hero.title} marker />
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-fg">{hero.lead}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a href={`${home}#contact`} className={PRIMARY_BUTTON}>
              {hero.cta}
            </a>
            <a href={`${home}#work`} className={`font-medium ${TEXT_LINK}`}>
              {hero.secondary} →
            </a>
          </div>
        </div>
        <div className="lg:col-span-5">
          <RunLog />
        </div>
      </Container>
    </section>
  );
}
