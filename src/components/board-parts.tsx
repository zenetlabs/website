import type { ReactNode } from 'react';
import { FlowTileMark } from '@/components/flow-tiles';
import type { FlowTile } from '@/content/types';

// The pieces both boards draw: a tile that can be pinged, a wire and the
// packets that ride it. All decoration; the boards' text carries the meaning.
export function BoardNode({
  tile,
  children,
}: {
  tile: FlowTile;
  children?: ReactNode;
}) {
  return (
    <span className="fb-node">
      <FlowTileMark tile={tile} />
      {children}
    </span>
  );
}

export function BoardPing({ row }: { row?: number }) {
  return (
    <i
      aria-hidden="true"
      className="fb-ping"
      style={row === undefined ? undefined : { '--k': row }}
    />
  );
}

export function BoardHop({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <span aria-hidden="true" className="fb-hop" data-to={to}>
      {children}
    </span>
  );
}

export function BoardPacket({ to, row }: { to?: string; row?: number }) {
  return (
    <i
      className="fb-pk"
      data-to={to}
      style={row === undefined ? undefined : { '--k': row }}
    />
  );
}
