import { EYEBROW, H3 } from '@/components/ui';

export type BeforeAfterRow = {
  id: string;
  title: string;
  before: string;
  after: string;
};

export function BeforeAfter({
  rows,
  beforeLabel,
  afterLabel,
}: {
  rows: readonly BeforeAfterRow[];
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <ul className="grid border-t border-hairline">
      {rows.map((row) => (
        <li key={row.id} className="ledger-row">
          <h3 className={H3}>{row.title}</h3>
          <div>
            <p className={EYEBROW}>{beforeLabel}</p>
            <p className="ledger-text text-fg-soft">{row.before}</p>
          </div>
          <div>
            <p className={`flex items-center gap-2 ${EYEBROW}`}>
              <span aria-hidden="true" className="icon icon-check text-agent" />
              {afterLabel}
            </p>
            <p className="ledger-text">{row.after}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
