import type { CalculatorPageContent, Price, Services } from '@/content/types';
import {
  answersQuery,
  type CalculatorAnswers,
  TOOL_IDS,
} from '@/lib/calculator-answers';
import type { Estimate, EstimateLine } from '@/lib/estimate';
import { rangePrice } from '@/lib/estimate';
import type { Locale } from '@/lib/i18n';
import { formatMoney, formatPrice } from '@/lib/money';
import { pagePath } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type Result = CalculatorPageContent['result'];

function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

export function rangeText(
  locale: Locale,
  range: { min: number; max: number },
  currency: Estimate['currency'],
): string {
  return formatPrice(locale, rangePrice(range, currency));
}

export function weeksText(result: Result, weeks: Estimate['weeks']): string {
  return weeks.min === weeks.max
    ? fill(result.weeksSingle, { n: weeks.min })
    : fill(result.weeks, { min: weeks.min, max: weeks.max });
}

export function maintenanceText(
  locale: Locale,
  result: Result,
  { maintenance }: Estimate,
): string {
  const plan = maintenance.price.label;
  if (plan === undefined) {
    throw new Error(`No label for ${maintenance.price.id}`);
  }
  return fill(
    maintenance.wanted ? result.maintenanceWanted : result.maintenanceNotWanted,
    { plan, price: formatPrice(locale, maintenance.price) },
  );
}

export function diagnosticText(
  locale: Locale,
  result: Result,
  services: Services,
  diagnostic: Price,
): string {
  return fill(result.diagnosticText, {
    name: services.diagnostic.name,
    price: formatPrice(locale, diagnostic),
  });
}

export function lineDriver(result: Result, line: EstimateLine): string {
  const parts: string[] = [];
  if (line.addOn) {
    parts.push(result.addOn);
  } else {
    const count =
      line.tools === 0
        ? result.tools.none
        : line.tools === 1
          ? result.tools.one
          : fill(result.tools.many, { n: line.tools });
    parts.push(line.custom ? `${count}, ${result.custom}` : count);
  }
  if (line.capped) parts.push(result.capped);
  return parts.join('; ');
}

function percent(result: Result, value: number): string {
  if (value === 0) return result.noChange;
  return fill(result.percent, {
    sign: value > 0 ? '+' : '−',
    n: Math.abs(value),
  });
}

export function adjustmentsText(
  result: Result,
  { adjustments }: Estimate,
): string {
  return `${result.volume} ${percent(result, adjustments.volumePercent)} · ${result.urgency} ${percent(result, adjustments.urgencyPercent)}`;
}

export function roundingText(
  locale: Locale,
  result: Result,
  { step }: Estimate,
): string {
  return fill(result.rounding, { step: formatMoney(locale, step) });
}

function answerLines(
  copy: CalculatorPageContent,
  answers: CalculatorAnswers,
): { legend: string; answer: string }[] {
  const { questions } = copy;
  const ticked = new Set(answers.tools);
  const extras = [
    ...(answers.agent ? [questions.extras.options.agent.label] : []),
    ...(answers.web ? [questions.extras.options.web.label] : []),
  ];
  return [
    {
      legend: questions.type.legend,
      answer: questions.type.options[answers.type].label,
    },
    {
      legend: questions.tools.legend,
      answer: TOOL_IDS.filter((id) => ticked.has(id))
        .map((id) => questions.tools.options[id].label)
        .join(', '),
    },
    {
      legend: questions.volume.legend,
      answer: questions.volume.options[answers.volume].label,
    },
    { legend: questions.extras.legend, answer: extras.join(', ') },
    {
      legend: questions.urgency.legend,
      answer: questions.urgency.options[answers.urgency].label,
    },
    {
      legend: questions.maintenance.legend,
      answer:
        questions.maintenance.options[answers.maintenance ? 'yes' : 'no'].label,
    },
  ];
}

function resultUrl(locale: Locale, answers: CalculatorAnswers): string {
  return `${SITE.url}${pagePath(locale, 'calculator')}?${answersQuery(answers)}#estimate`;
}

export function leadMessage({
  locale,
  copy,
  services,
  answers,
  estimate,
}: {
  locale: Locale;
  copy: CalculatorPageContent;
  services: Services;
  answers: CalculatorAnswers;
  estimate: Estimate;
}): string {
  const { result, contact } = copy;
  return [
    fill(contact.intro, { version: estimate.rulesVersion }),
    `${result.labels.total}: ${rangeText(locale, estimate.total, estimate.currency)}`,
    `${result.labels.timeline}: ${weeksText(result, estimate.weeks)}`,
    `${result.labels.maintenance}: ${maintenanceText(locale, result, estimate)}`,
    ...estimate.lines.map(
      (line) =>
        `- ${services[line.id].name}: ${rangeText(locale, line, estimate.currency)} (${lineDriver(result, line)})`,
    ),
    `${result.labels.answers}:`,
    ...answerLines(copy, answers).map(
      ({ legend, answer }) => `- ${legend} ${answer || '–'}`,
    ),
    `${contact.page}: ${resultUrl(locale, answers)}`,
    '',
    '',
  ].join('\n');
}
