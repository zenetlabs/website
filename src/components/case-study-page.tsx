import { BulletList, MetricList } from '@/components/lists';
import {
  CardGrid,
  FactList,
  GetStarted,
  HeroHeading,
  RelatedLinks,
} from '@/components/page-blocks';
import { Process } from '@/components/process';
import { Container, Section } from '@/components/section';
import type {
  CasePageContent,
  Metric,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';

function dayMonthYear(iso: string): string {
  return iso.split('-').reverse().join('/');
}

export function CaseStudyPage({
  locale,
  copy,
  hub,
  metrics,
  lastmod,
}: {
  locale: Locale;
  copy: CasePageContent;
  hub: ServicesHubContent;
  metrics: readonly Metric[];
  lastmod: string;
}) {
  return (
    <>
      <header>
        <Container className="py-16 md:py-24">
          <HeroHeading
            eyebrow={copy.eyebrow}
            title={copy.title}
            lead={copy.lead}
          />
          <p className="mt-6 text-sm text-muted-fg">
            {copy.labels.published}{' '}
            <time dateTime={copy.published}>
              {dayMonthYear(copy.published)}
            </time>
            {lastmod === copy.published ? null : (
              <>
                {' · '}
                {copy.labels.updated}{' '}
                <time dateTime={lastmod}>{dayMonthYear(lastmod)}</time>
              </>
            )}
          </p>
          <FactList facts={copy.facts} />
        </Container>
      </header>
      <Section
        id="problem"
        eyebrow={copy.problem.eyebrow}
        title={copy.problem.title}
      >
        <div className="grid max-w-3xl gap-4 text-lg text-muted-fg">
          {copy.problem.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Section>
      <Section id="built" eyebrow={copy.built.eyebrow} title={copy.built.title}>
        <CardGrid items={copy.built.items} locale={locale} />
      </Section>
      <Process id="operations" copy={copy.operations} />
      <Section
        id="results"
        eyebrow={copy.results.eyebrow}
        title={copy.results.title}
      >
        <BulletList items={copy.results.points} className="max-w-3xl text-lg" />
        <MetricList
          metrics={metrics}
          locale={locale}
          className="mt-10 max-w-3xl"
        />
      </Section>
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
      <RelatedLinks
        locale={locale}
        pages={copy.related}
        names={hubNames(hub)}
        labels={hub.labels}
      />
    </>
  );
}
