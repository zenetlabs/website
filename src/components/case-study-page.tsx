import { CompanyMark } from '@/components/companies-strip';
import { DeskClose } from '@/components/desk-close';
import { FlowBoard } from '@/components/flow-board';
import { Ledger } from '@/components/ledger';
import { BulletList, MetricList } from '@/components/lists';
import { Breadcrumb, RelatedLinks } from '@/components/page-blocks';
import { PageHero } from '@/components/page-hero';
import { FactList } from '@/components/plain-hero';
import { Process } from '@/components/process';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { PROSE } from '@/components/ui';
import type {
  CasePageContent,
  DeskCloseCopy,
  Metric,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { portfolioOf } from '@/lib/portfolio';

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
  close,
}: {
  locale: Locale;
  copy: CasePageContent;
  hub: ServicesHubContent;
  metrics: readonly Metric[];
  lastmod: string;
  close: DeskCloseCopy;
}) {
  return (
    <>
      <PageHero
        breadcrumb={
          <>
            <Breadcrumb
              page="viatsyCase"
              locale={locale}
              names={hubNames(hub)}
              label={hub.labels.breadcrumb}
            />
            <span className="case-mark">
              <CompanyMark name={VIATSY.name} logo={VIATSY.logo} />
            </span>
          </>
        }
        title={copy.title}
        lead={copy.lead}
        actions={
          <p className="case-dates">
            <span>
              {copy.labels.published}{' '}
              <time dateTime={copy.published}>
                {dayMonthYear(copy.published)}
              </time>
            </span>
            {lastmod === copy.published ? null : (
              <span>
                {copy.labels.updated}{' '}
                <time dateTime={lastmod}>{dayMonthYear(lastmod)}</time>
              </span>
            )}
          </p>
        }
        stage={<FlowBoard flow={copy.flow} actors={hub.labels.actors} />}
        aside={<FactList facts={copy.facts} />}
        asideSpan="full"
      />
      <StickyZone locale={locale}>
        <Section
          id="problem"
          title={copy.problem.title}
          intro={copy.intro}
          layout="split"
        >
          <div className={`grid gap-4 text-lg ${PROSE}`}>
            {copy.problem.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Section>
        <Section id="built" title={copy.built.title} variant="tint">
          <Ledger items={copy.built.items} locale={locale} />
        </Section>
        <Process id="operations" copy={copy.operations} stub={null} />
        <Section
          id="results"
          title={copy.results.title}
          variant="tint"
          layout="split"
        >
          <BulletList
            items={copy.results.points}
            marker="tick"
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
      <DeskClose
        cta={copy.cta}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
