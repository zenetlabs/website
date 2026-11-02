import { Faq } from '@/components/faq';
import {
  Breadcrumb,
  DataTable,
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import type {
  HoldedPairContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import type { HoldedPageId } from '@/lib/page-registry';

export function HoldedPairPage({
  page,
  locale,
  copy,
  hub,
  services,
}: {
  page: HoldedPageId;
  locale: Locale;
  copy: HoldedPairContent;
  hub: ServicesHubContent;
  services: Services;
}) {
  const names = hubNames(hub);
  const { columns, rows, note, ...section } = copy.sync;

  return (
    <>
      <FactsHero
        page={page}
        locale={locale}
        services={services}
        labels={hub.labels}
        hero={copy.hero}
        facts={copy.facts}
        button={copy.cta.button}
        breadcrumb={
          <Breadcrumb
            page={page}
            locale={locale}
            names={names}
            label={hub.labels.breadcrumb}
          />
        }
      />
      <StickyZone locale={locale}>
        <Section id="sync" title={section.title} lead={section.lead}>
          <DataTable
            labelledBy="sync-title"
            columns={[columns.data, columns.direction, columns.when]}
            rows={rows.map((row) => ({
              id: row.id,
              cells: [row.data, row.direction, row.when],
            }))}
            iconColumn={1}
          />
          <p className="mt-6 max-w-[60ch] text-ui-s text-muted-fg">{note}</p>
        </Section>
        <Section id="edge-cases" title={copy.edgeCases.title} variant="tint">
          <UseCaseList items={copy.edgeCases.items} locale={locale} />
        </Section>
        <Faq copy={copy.faq} items={copy.faq.items} />
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={names}
          labels={hub.labels}
        />
      </StickyZone>
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
    </>
  );
}
