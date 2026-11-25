import { Fragment } from 'react';
import type { FlowTile, FlowTool } from '@/content/types';

// The tools with a mark of their own in `public/icons/tools/`
const MARKED = [
  'shopify',
  'xero',
  'sheets',
  'hubspot',
  'gmail',
  'whatsapp',
  'woocommerce',
  'prestashop',
] as const satisfies readonly FlowTool[];

type Marked = (typeof MARKED)[number];

// `app` is a custom app; Holded has no mark we can ship, so it is drawn as a
// ledger. Both in the blue of the customer's tools.
function isMarked(tile: FlowTile): tile is Marked {
  return MARKED.some((tool) => tool === tile);
}

// The person, a custom app and Holded are drawn by an icon mask (`--icon`)
const ICONS: Partial<Record<FlowTile, string>> = {
  human: 'icon-human',
  app: 'icon-app',
  holded: 'icon-ledger',
};

export function FlowTileMark({
  tile,
  className = '',
}: {
  tile: FlowTile;
  className?: string;
}) {
  const marked = isMarked(tile);
  return (
    <span
      aria-hidden="true"
      data-actor={marked ? undefined : tile === 'holded' ? 'app' : tile}
      className={`flow-tile ${ICONS[tile] ?? ''} ${className}`}
      style={
        marked ? { '--tool-icon': `url(/icons/tools/${tile}.svg)` } : undefined
      }
    />
  );
}

// The customer's tools (in their own colours), our agent, and the person who
// approves, joined by wires. Decorative: the text beside it says the same.
export function FlowRow({
  tiles,
  className = '',
}: {
  tiles: readonly FlowTile[];
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`flow-row ${className}`}>
      {tiles.map((tile, index) => (
        <Fragment key={tile}>
          {index > 0 ? (
            <span
              className="flow-wire"
              data-to={tile === 'human' ? 'human' : undefined}
            />
          ) : null}
          <FlowTileMark tile={tile} />
        </Fragment>
      ))}
    </div>
  );
}
