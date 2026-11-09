import { Faq } from '@/components/faq';
import { FlowTileMark } from '@/components/offer-system';
import {
  Breadcrumb,
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import type {
  FlowTool,
  HoldedPairContent,
  Services,
  ServicesHubContent,
  SyncRow,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import type { HoldedPageId } from '@/lib/page-registry';

// The shop on the left, Holded on the right, and the way each datum travels
// between them. The legend and the arrows are drawn; the table says it all.
function SyncTable({
  shop,
  sync,
}: {
  shop: HoldedPairContent['shop'];
  sync: HoldedPairContent['sync'];
}) {
  const { columns, rows } = sync;
  return (
    <>
      <p aria-hidden="true" className="sync-pair">
        <span className="sync-pair-end">
          <FlowTileMark tile={shop.tool} />
          {shop.name}
        </span>
        <span className="sync-pair-wire" />
        <span className="sync-pair-end">
          Holded
          <FlowTileMark tile="holded" />
        </span>
      </p>
      <table aria-labelledby="sync-title" className="data-table sync-table">
        <thead>
          <tr>
            {[columns.data, columns.direction, columns.when].map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.data}</th>
              <td data-label={columns.direction} className="sync-cell">
                <Lane row={row} shop={shop.tool} />
                <span className="sync-direction">{row.direction}</span>
              </td>
              <td data-label={columns.when}>{row.when}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Lane({ row, shop }: { row: SyncRow; shop: FlowTool }) {
  return (
    <span
      aria-hidden="true"
      className="sync-lane"
      data-to={row.to}
      data-both={row.both ? '' : undefined}
    >
      <FlowTileMark tile={shop} className="sync-end" />
      <span className="sync-wire" />
      <FlowTileMark tile="holded" className="sync-end" />
    </span>
  );
}

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
  const { note, ...section } = copy.sync;

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
          <SyncTable shop={copy.shop} sync={copy.sync} />
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
