import { BULLET_ITEM, TICK_ITEM } from '@/components/ui';
import type { Metric } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isMeasured } from '@/lib/metrics';
import { formatNumber } from '@/lib/money';

export function BulletList({
  items,
  className = '',
  marker = 'dot',
}: {
  items: readonly string[];
  className?: string;
  marker?: 'dot' | 'tick';
}) {
  return (
    <ul className={`${className} grid gap-2 md:gap-3`}>
      {items.map((item) => (
        <li key={item} className={marker === 'tick' ? TICK_ITEM : BULLET_ITEM}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function MetricList({
  metrics,
  locale,
  className,
}: {
  metrics: readonly Metric[];
  locale: Locale;
  className: string;
}) {
  const measured = metrics.filter(isMeasured);
  if (measured.length === 0) return null;
  return (
    <dl
      className={`${className} grid grid-cols-2 gap-4 border-t border-hairline pt-6`}
    >
      {measured.map((metric) => (
        <div key={metric.id}>
          <dt className="text-sm text-muted-fg">{metric.label}</dt>
          <dd className="font-display text-3xl">
            {formatNumber(locale, metric.value)}
            {metric.unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}
