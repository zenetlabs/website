import { DeskClose } from '@/components/desk-close';
import { Faq } from '@/components/faq';
import { FlowTileMark } from '@/components/flow-tiles';
import { Ledger } from '@/components/ledger';
import { Breadcrumb, RelatedLinks } from '@/components/page-blocks';
import { HeroActions, PageHero } from '@/components/page-hero';
import { PairBoard } from '@/components/pair-board';
import { Includes, PriceTicket } from '@/components/price-ticket';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import type {
  DeskCloseCopy,
  FlowTool,
  HoldedPairContent,
  Services,
  ServicesHubContent,
  SyncRow,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { type HoldedPageId, serviceOf } from '@/lib/page-registry';
import { titleText } from '@/lib/title-text';

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
  includes,
  close,
}: {
  page: HoldedPageId;
  locale: Locale;
  copy: HoldedPairContent;
  hub: ServicesHubContent;
  services: Services;
  includes: readonly string[];
  close: DeskCloseCopy;
}) {
  const names = hubNames(hub);
  const { note, ...section } = copy.sync;

  return (
    <>
      <PageHero
        title={copy.hero.title}
        lead={copy.hero.lead}
        actions={
          <HeroActions
            locale={locale}
            button={copy.cta.button}
            secondary={{ label: hub.labels.pricing, page: 'pricing' }}
          />
        }
        breadcrumb={
          <Breadcrumb
            page={page}
            locale={locale}
            names={names}
            label={hub.labels.breadcrumb}
          />
        }
        stage={
          <>
            <PairBoard
              shop={copy.shop}
              caption={titleText(section.title)}
              rows={section.rows}
            />
            <PriceTicket
              service={services[serviceOf(page)]}
              facts={copy.facts}
              labels={hub.labels}
              locale={locale}
            />
          </>
        }
        aside={<Includes label={hub.labels.included} items={includes} />}
      />
      <StickyZone locale={locale}>
        <Section
          id="sync"
          title={section.title}
          intro={copy.hero.intro}
          lead={section.lead}
        >
          <SyncTable shop={copy.shop} sync={copy.sync} />
          <p className="mt-6 max-w-[60ch] text-ui-s text-muted-fg">{note}</p>
        </Section>
        <Section id="edge-cases" title={copy.edgeCases.title} variant="tint">
          <Ledger items={copy.edgeCases.items} locale={locale} />
        </Section>
        <Faq copy={copy.faq} items={copy.faq.items} />
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={names}
          labels={hub.labels}
        />
      </StickyZone>
      <DeskClose
        cta={copy.cta}
        faq={copy.faq}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
