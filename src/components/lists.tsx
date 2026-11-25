import { BULLET_ITEM, TICK_ITEM } from '@/components/ui';
import type { Metric } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isMeasured, metricFigure } from '@/lib/metrics';

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
          <dd className="text-3xl font-semibold tracking-tight">
            {metricFigure(locale, metric)}
            {metric.estimate ? (
              <span className="block text-sm font-normal tracking-normal text-muted-fg">
                {' '}
                {metric.estimate}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
