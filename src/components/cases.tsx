import { Section } from '@/components/section';
import { BULLET_ITEM, CARD, EYEBROW } from '@/components/ui';
import type { HomeContent, Metric } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';

type MeasuredMetric = Metric & { value: number };

function isMeasured(metric: Metric): metric is MeasuredMetric {
  return metric.value !== null;
}

export function Cases({
  copy,
  locale,
}: {
  copy: HomeContent['cases'];
  locale: Locale;
}) {
  return (
    <Section
      id="cases"
      eyebrow={copy.eyebrow}
      title={copy.title}
      lead={copy.lead}
    >
      <ul className="grid gap-6 lg:grid-cols-2">
        {copy.items.map((item) => {
          const measured = item.metrics.filter(isMeasured);
          return (
            <li key={item.id} className={`${CARD} flex flex-col p-8`}>
              <p className={EYEBROW}>{item.tag}</p>
              <h3 className="mt-4 font-display text-3xl leading-tight">
                {item.name}
              </h3>
              <p className="mt-4 text-muted-fg">{item.context}</p>
              <div className="mt-6 border-t border-hairline pt-6">
                <p className={EYEBROW}>{copy.automatedLabel}</p>
                <ul className="mt-4 grid gap-3">
                  {item.automated.map((line) => (
                    <li key={line} className={BULLET_ITEM}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              {measured.length > 0 ? (
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-6">
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
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
