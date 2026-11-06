import { Fragment } from 'react';

const TOOLS = [
  'shopify',
  'xero',
  'sheets',
  'hubspot',
  'gmail',
  'whatsapp',
] as const;

type Tool = (typeof TOOLS)[number];
export type FlowTile = Tool | 'app' | 'agent' | 'human';

function isTool(tile: FlowTile): tile is Tool {
  return TOOLS.some((tool) => tool === tile);
}

function Tile({ tile }: { tile: FlowTile }) {
  if (isTool(tile)) {
    return (
      <span
        className="flow-tile"
        style={{ '--tool-icon': `url(/icons/tools/${tile}.svg)` }}
      />
    );
  }
  if (tile === 'human') {
    return (
      <span data-actor="human" className="flow-tile">
        <span className="icon icon-human text-xl" />
      </span>
    );
  }
  if (tile === 'app') {
    return (
      <span data-actor="app" className="flow-tile">
        <span className="icon icon-app text-2xl" />
      </span>
    );
  }
  return <span data-actor="agent" className="flow-tile" />;
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
          <Tile tile={tile} />
        </Fragment>
      ))}
    </div>
  );
}
