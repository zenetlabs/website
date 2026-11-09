import { CompanyMark } from '@/components/companies-strip';
import { FlowDiagram } from '@/components/flow-diagram';
import { BulletList, MetricList } from '@/components/lists';
import {
  FactList,
  GetStarted,
  HeroHeading,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Process } from '@/components/process';
import { Container, Section } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { PROSE } from '@/components/ui';
import type {
  CasePageContent,
  Metric,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { portfolioOf } from '@/lib/portfolio';

const TINT = sectionFrame('tint');

const VIATSY = portfolioOf('viatsy');

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
      <header data-ground={TINT.ground} className={TINT.bg}>
        <Container className="page-hero">
          <div className="lg:col-span-7">
            <span className="case-mark">
              <CompanyMark name={VIATSY.name} logo={VIATSY.logo} />
            </span>
            <HeroHeading title={copy.title} lead={copy.lead} />
            <p className="mt-6 text-ui-s text-muted-fg">
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
          </div>
          <div id="flow" className="lg:col-span-5">
            <FlowDiagram
              steps={copy.flow.steps}
              actors={hub.labels.actors}
              caption={copy.flow.caption}
            />
          </div>
          <div className="lg:col-span-12">
            <FactList facts={copy.facts} />
          </div>
        </Container>
      </header>
      <StickyZone locale={locale}>
        <Section id="problem" title={copy.problem.title}>
          <div className={`grid gap-4 text-lg ${PROSE}`}>
            {copy.problem.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Section>
        <Section id="built" title={copy.built.title}>
          <UseCaseList items={copy.built.items} locale={locale} />
        </Section>
        <Process id="operations" copy={copy.operations} />
        <Section id="results" title={copy.results.title} variant="tint">
          <BulletList
            items={copy.results.points}
            className="max-w-[60ch] text-lg"
          />
          <MetricList
            metrics={metrics}
            locale={locale}
            className="mt-10 max-w-[60ch]"
          />
        </Section>
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={hubNames(hub)}
          labels={hub.labels}
        />
      </StickyZone>
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
    </>
  );
}
