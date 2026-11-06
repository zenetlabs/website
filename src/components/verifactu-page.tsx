import { Faq } from '@/components/faq';
import { BulletList } from '@/components/lists';
import {
  DataTable,
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Container, Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { H3, PROSE } from '@/components/ui';
import type {
  Services,
  ServicesHubContent,
  VerifactuPageContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';

export function VerifactuPage({
  locale,
  copy,
  hub,
  services,
}: {
  locale: Locale;
  copy: VerifactuPageContent;
  hub: ServicesHubContent;
  services: Services;
}) {
  const { deadlines, requirements, work } = copy;

  return (
    <>
      <FactsHero
        page="verifactu"
        locale={locale}
        services={services}
        labels={hub.labels}
        hero={copy.hero}
        facts={copy.facts}
        button={copy.cta.button}
      />
      <StickyZone locale={locale}>
        <Section id="deadlines" title={deadlines.title}>
          <DataTable
            labelledBy="deadlines-title"
            columns={[deadlines.columns.who, deadlines.columns.date]}
            rows={deadlines.rows.map((row) => ({
              id: row.id,
              cells: [row.who, row.date],
            }))}
          />
          <div className={`mt-8 grid gap-4 ${PROSE}`}>
            <p>{deadlines.announced}</p>
            <p>{deadlines.producers}</p>
          </div>
          <h3 className={`mt-10 ${H3}`}>{deadlines.exclusionsTitle}</h3>
          <BulletList
            items={deadlines.exclusions}
            className={`mt-4 ${PROSE}`}
          />
          <p className="mt-8 text-ui-s text-muted-fg">{deadlines.checked}</p>
        </Section>
        <Section
          id="requirements"
          title={requirements.title}
          lead={requirements.lead}
          variant="tint"
        >
          <UseCaseList items={requirements.items} locale={locale} />
        </Section>
        <Section id="what-we-do" title={work.title}>
          <UseCaseList items={work.items} locale={locale} />
          <p className={`mt-8 ${PROSE}`}>{work.limits}</p>
        </Section>
        <Faq copy={copy.faq} items={copy.faq.items} />
        <Container className="pb-10">
          <p className="max-w-[60ch] text-ui-s text-muted-fg">
            {copy.disclaimer}
          </p>
        </Container>
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
