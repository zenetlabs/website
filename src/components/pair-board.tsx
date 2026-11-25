import {
  BoardHop,
  BoardNode,
  BoardPacket,
  BoardPing,
} from '@/components/board-parts';
import type { HoldedPairContent, SyncRow } from '@/content/types';

const PAIR_ROWS = 4;

function Pings({ rows, to }: { rows: readonly SyncRow[]; to: SyncRow['to'] }) {
  return rows.map((row, index) =>
    row.to === to ? <BoardPing key={row.id} row={index} /> : null,
  );
}

// A Holded pair as the first four rows of its mapping crossing one wire. It
// is decoration: the full table follows it, so the figure is hidden from
// assistive technology and from the page's markdown.
export function PairBoard({
  shop,
  caption,
  rows,
}: {
  shop: HoldedPairContent['shop'];
  caption: string;
  rows: readonly SyncRow[];
}) {
  const shown = rows.slice(0, PAIR_ROWS);
  return (
    <figure
      aria-hidden="true"
      className="flow-board"
      data-scene
      data-flow-board="pair"
    >
      <figcaption className="flow-board-cap">{caption}</figcaption>
      <div className="fb-pair">
        <span className="fb-end">
          <BoardNode tile={shop.tool}>
            <Pings rows={shown} to="shop" />
          </BoardNode>
          <span className="fb-name">{shop.name}</span>
        </span>
        <BoardHop to="tool">
          {shown.map((row, index) => (
            <BoardPacket key={row.id} to={row.to} row={index} />
          ))}
        </BoardHop>
        <span className="fb-end">
          <BoardNode tile="holded">
            <Pings rows={shown} to="holded" />
          </BoardNode>
          <span className="fb-name">Holded</span>
        </span>
      </div>
      <ul className="fb-rows">
        {shown.map((row) => (
          <li key={row.id}>
            <span className="font-semibold">{row.data}</span>
            <span className="text-muted-fg">{row.direction}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
