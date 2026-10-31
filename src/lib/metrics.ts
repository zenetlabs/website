import type { Metric } from '@/content/types';

export function isMeasured(
  metric: Metric,
): metric is Metric & { value: number } {
  return metric.value !== null;
}
