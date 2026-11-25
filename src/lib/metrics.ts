import type { Metric } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatNumber } from '@/lib/money';

export function isMeasured(
  metric: Metric,
): metric is Metric & { value: number } {
  return metric.value !== null;
}

// The figure with its unit and, when it is rounded, its "about": "about 40"
export function metricFigure(
  locale: Locale,
  metric: Metric & { value: number },
): string {
  return `${metric.approx ? `${metric.approx} ` : ''}${formatNumber(locale, metric.value)}${metric.unit}`;
}

// The figure as plain text, with the estimate marked: "8 h (estimated)"
export function metricText(
  locale: Locale,
  metric: Metric & { value: number },
): string {
  const figure = metricFigure(locale, metric);
  return metric.estimate ? `${figure} (${metric.estimate})` : figure;
}
