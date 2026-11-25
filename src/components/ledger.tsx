import { FlowRow } from '@/components/flow-tiles';
import { H3, TEXT_LINK } from '@/components/ui';
import type { LedgerItem } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

// Ruled task rows: the task, what it does and, when the row names them, the
// tools it touches.
export function Ledger({
  items,
  locale,
}: {
  items: readonly LedgerItem[];
  locale: Locale;
}) {
  return (
    <ul className="ledger">
      {items.map((item) => (
        <li key={item.id} data-tiles={item.tiles ? '' : undefined}>
          <h3 className={H3}>
            {item.page ? (
              <a href={pagePath(locale, item.page)} className={TEXT_LINK}>
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          <p className="text-ui-m text-fg-soft md:text-base">{item.text}</p>
          {item.tiles ? (
            <FlowRow tiles={item.tiles} className="ledger-tiles" />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
