import { PRICING_RULES } from '@/content/pricing-rules';
import type {
  Currency,
  Price,
  PricingRules,
  ProjectComponent,
  Services,
} from '@/content/types';
import {
  type CalculatorAnswers,
  type ProjectType,
  TOOL_IDS,
  VOLUMES,
} from '@/lib/calculator-answers';

export type Market = {
  currency: Currency;
  ladder: Services;
  rules: PricingRules;
};

export type MaintenanceTier = 'essential' | 'standard' | 'extended';

export type EstimateLine = {
  id: ProjectComponent;
  min: number;
  max: number;
  capped: boolean;
  tools: number;
  custom: boolean;
  addOn: boolean;
};

export type Estimate = {
  currency: Currency;
  rulesVersion: string;
  step: number;
  total: { min: number; max: number };
  lines: EstimateLine[];
  weeks: { min: number; max: number };
  maintenance: { price: Price; tier: MaintenanceTier; wanted: boolean };
  diagnostic: Price;
  adjustments: { volumePercent: number; urgencyPercent: number };
  capped: boolean;
};

const COMPONENT_OF: Record<ProjectType, ProjectComponent> = {
  automation: 'integration',
  agent: 'agent',
  web: 'web',
};
const ORDER: readonly ProjectComponent[] = ['integration', 'agent', 'web'];

export function market(
  currency: Currency,
  ladder: Services,
  rules: PricingRules = PRICING_RULES,
): Market {
  return { currency, ladder, rules };
}

function floorDiv(value: number, divisor: number): number {
  return (value - (value % divisor)) / divisor;
}

function ceilDiv(value: number, divisor: number): number {
  return floorDiv(value + divisor - 1, divisor);
}

function clamp(value: number, floor: number, cap: number): number {
  return Math.min(cap, Math.max(floor, value));
}

function tierPrice(ladder: Services, tier: MaintenanceTier): Price {
  const price = ladder.maintenance.prices.find(
    ({ id }) => id === `maintenance-${tier}`,
  );
  if (price === undefined) throw new Error(`No maintenance tier ${tier}`);
  return price;
}

function includes(
  answers: CalculatorAnswers,
  component: ProjectComponent,
): boolean {
  return (
    component === COMPONENT_OF[answers.type] ||
    (component === 'agent' && answers.agent) ||
    (component === 'web' && answers.web)
  );
}

export function estimate(
  answers: CalculatorAnswers,
  { currency, ladder, rules }: Market,
): Estimate {
  const { shared } = rules;
  const { step, components } = rules.markets[currency];
  const tools = TOOL_IDS.filter((id) => answers.tools.includes(id));
  const primary = COMPONENT_OF[answers.type];
  const hasCustom = tools.includes('custom');
  const included = ORDER.filter((component) => includes(answers, component));
  const volumePercent = shared.volumePercent[answers.volume];
  const urgency = shared.urgency[answers.urgency];

  let weeksLow = 0;
  let weeksHigh = 0;
  const lines = included.map((id): EstimateLine => {
    const [price] = ladder[id].prices;
    const money = components[id];
    const time = shared.components[id];
    const addOn = id !== primary;
    const count = addOn ? 0 : tools.length;
    const custom = !addOn && hasCustom;
    const extra = Math.max(0, count - time.includedTools);
    const k = custom ? 1 : 0;
    const cap = price.max ?? money.cap ?? Number.POSITIVE_INFINITY;
    const lowBase =
      price.min + extra * money.perTool[0] + k * money.perCustom[0];
    const highBase =
      price.min +
      money.spread +
      extra * money.perTool[1] +
      k * money.perCustom[1];
    const factor = (100 + volumePercent) * (100 + urgency.pricePercent);
    const lowUnits = floorDiv(lowBase * factor, 10000 * step);
    const highUnits = ceilDiv(highBase * factor, 10000 * step);

    const share = addOn ? shared.addOnWeeksPercent : 100;
    weeksLow +=
      2 *
      (time.weeks[0] +
        extra * time.weeksPerTool[0] +
        k * time.weeksPerCustom[0]) *
      share;
    weeksHigh +=
      2 *
      (time.weeks[1] +
        extra * time.weeksPerTool[1] +
        k * time.weeksPerCustom[1]) *
      share;

    return {
      id,
      min: clamp(lowUnits * step, price.min, cap),
      max: clamp(highUnits * step, price.min, cap),
      capped: highUnits * step > cap,
      tools: count,
      custom,
      addOn,
    };
  });

  const weeksFactor = 100 + urgency.weeksPercent;
  const weeksMin = Math.max(1, floorDiv(weeksLow * weeksFactor, 20000));
  const weeksMax = Math.max(weeksMin, ceilDiv(weeksHigh * weeksFactor, 20000));

  const tier: MaintenanceTier = included.includes('agent')
    ? 'extended'
    : included.length >= 2 ||
        tools.length >= shared.maintenance.standardFromTools ||
        VOLUMES.indexOf(answers.volume) >=
          VOLUMES.indexOf(shared.maintenance.standardFromVolume)
      ? 'standard'
      : 'essential';

  return {
    currency,
    rulesVersion: rules.version,
    step,
    total: {
      min: lines.reduce((sum, line) => sum + line.min, 0),
      max: lines.reduce((sum, line) => sum + line.max, 0),
    },
    lines,
    weeks: { min: weeksMin, max: weeksMax },
    maintenance: {
      price: tierPrice(ladder, tier),
      tier,
      wanted: answers.maintenance,
    },
    diagnostic: ladder.diagnostic.prices[0],
    adjustments: { volumePercent, urgencyPercent: urgency.pricePercent },
    capped: lines.some((line) => line.capped),
  };
}

export function rangePrice(
  range: { min: number; max: number },
  currency: Currency,
): Price {
  return {
    id: 'estimate',
    min: range.min,
    max: range.max > range.min ? range.max : undefined,
    unit: 'one-off',
    currency,
  };
}
