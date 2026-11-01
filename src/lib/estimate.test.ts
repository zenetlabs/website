import { describe, expect, it } from 'vitest';
import { PRICING_RULES } from '@/content/pricing-rules';
import type { Currency, PricingRules, ProjectComponent } from '@/content/types';
import {
  answersQuery,
  type CalculatorAnswers,
  TOOL_IDS,
  URGENCIES,
  VOLUMES,
} from '@/lib/calculator-answers';
import {
  type Estimate,
  estimate,
  type Market,
  market,
  rangePrice,
} from '@/lib/estimate';
import { formatPrice } from '@/lib/money';
import {
  allAnswers,
  G1,
  G2,
  G3,
  G4,
  G5,
  G6,
} from '../../test/calculator-fixtures';
import { CURRENCY, SERVICES } from '../../test/page-content';

const MARKETS: Record<Currency, Market> = {
  EUR: market('EUR', SERVICES.es),
  SGD: market('SGD', SERVICES.en),
};
const CURRENCIES: readonly Currency[] = ['EUR', 'SGD'];
const COMPONENTS: readonly ProjectComponent[] = ['integration', 'agent', 'web'];

const GOLDENS: ReadonlyArray<{
  name: string;
  answers: CalculatorAnswers;
  EUR: { min: number; max: number; weeks: [number, number]; tier: string };
  SGD: { min: number; max: number; weeks: [number, number]; tier: string };
  lines?: Record<Currency, Array<[string, number, number]>>;
  capped?: boolean;
}> = [
  {
    name: 'G1 two tools',
    answers: G1,
    EUR: { min: 4000, max: 7000, weeks: [3, 5], tier: 'essential' },
    SGD: { min: 8500, max: 13500, weeks: [3, 5], tier: 'essential' },
  },
  {
    name: 'G2 automation plus an agent',
    answers: G2,
    EUR: { min: 17500, max: 25500, weeks: [6, 11], tier: 'extended' },
    SGD: { min: 33500, max: 49000, weeks: [6, 11], tier: 'extended' },
    lines: {
      EUR: [
        ['integration', 7500, 11500],
        ['agent', 10000, 14000],
      ],
      SGD: [
        ['integration', 15000, 22500],
        ['agent', 18500, 26500],
      ],
    },
  },
  {
    name: 'G3 urgent agent',
    answers: G3,
    EUR: { min: 11500, max: 16500, weeks: [4, 7], tier: 'extended' },
    SGD: { min: 22000, max: 32000, weeks: [4, 7], tier: 'extended' },
  },
  {
    name: 'G4 no rush clamps at the floor',
    answers: G4,
    EUR: { min: 6000, max: 9000, weeks: [6, 10], tier: 'essential' },
    SGD: { min: 12000, max: 17500, weeks: [6, 10], tier: 'essential' },
  },
  {
    name: 'G5 everything, capped',
    answers: G5,
    EUR: { min: 30000, max: 35500, weeks: [9, 16], tier: 'extended' },
    SGD: { min: 55000, max: 65500, weeks: [9, 16], tier: 'extended' },
    lines: {
      EUR: [
        ['agent', 20000, 20000],
        ['web', 10000, 15500],
      ],
      SGD: [
        ['agent', 35000, 35000],
        ['web', 20000, 30500],
      ],
    },
    capped: true,
  },
  {
    name: 'G6 in-house system',
    answers: G6,
    EUR: { min: 7000, max: 10500, weeks: [4, 8], tier: 'standard' },
    SGD: { min: 14000, max: 21000, weeks: [4, 8], tier: 'standard' },
  },
];

describe('estimate goldens', () => {
  describe.each(GOLDENS)('$name', (golden) => {
    it.each(CURRENCIES)('is pinned in %s', (currency) => {
      const result = estimate(golden.answers, MARKETS[currency]);
      const expected = golden[currency];
      expect(result.total).toEqual({ min: expected.min, max: expected.max });
      expect([result.weeks.min, result.weeks.max]).toEqual(expected.weeks);
      expect(result.maintenance.tier).toBe(expected.tier);
      expect(result.maintenance.wanted).toBe(golden.answers.maintenance);
      expect(result.capped).toBe(golden.capped ?? false);
      if (golden.lines) {
        expect(
          result.lines.map((line) => [line.id, line.min, line.max]),
        ).toEqual(golden.lines[currency]);
      }
    });
  });

  it('formats the first golden as published ranges', () => {
    const [first] = GOLDENS;
    if (!first) throw new Error('no goldens');
    const es = estimate(first.answers, MARKETS.EUR);
    const en = estimate(first.answers, MARKETS.SGD);
    expect(formatPrice('es', rangePrice(es.total, 'EUR'))).toBe(
      '4.000–7.000\u00a0€',
    );
    expect(formatPrice('en', rangePrice(en.total, 'SGD'))).toBe(
      'S$8,500–13,500',
    );
  });

  it('shows a capped line with equal bounds as a single amount', () => {
    expect(
      formatPrice('es', rangePrice({ min: 20000, max: 20000 }, 'EUR')),
    ).toBe('20.000\u00a0€');
  });

  it('applies integer percentages exactly', () => {
    const result = estimate(
      { ...G1, maintenance: false },
      {
        ...MARKETS.EUR,
        rules: {
          ...PRICING_RULES,
          markets: {
            ...PRICING_RULES.markets,
            EUR: {
              ...PRICING_RULES.markets.EUR,
              step: 500,
              components: {
                ...PRICING_RULES.markets.EUR.components,
                integration: {
                  ...PRICING_RULES.markets.EUR.components.integration,
                  spread: 1000,
                },
              },
            },
          },
        },
      },
    );
    expect(result.lines[0]?.max).toBe(5500);
  });
});

const TIER_RANK = { essential: 0, standard: 1, extended: 2 };

function upgrades(a: CalculatorAnswers): CalculatorAnswers[] {
  const next: CalculatorAnswers[] = [];
  for (const id of TOOL_IDS) {
    if (!a.tools.includes(id)) next.push({ ...a, tools: [...a.tools, id] });
  }
  const volume = VOLUMES[VOLUMES.indexOf(a.volume) + 1];
  if (volume) next.push({ ...a, volume });
  const urgency = URGENCIES[URGENCIES.indexOf(a.urgency) + 1];
  if (urgency) next.push({ ...a, urgency });
  if (!a.agent) next.push({ ...a, agent: true });
  if (!a.web) next.push({ ...a, web: true });
  return next;
}

const byLine = (result: Estimate) =>
  new Map(result.lines.map((line) => [line.id, line]));

type Row = {
  answers: CalculatorAnswers;
  result: Estimate;
  key: string;
};

describe.each(CURRENCIES)('exhaustive properties (%s)', (currency) => {
  const target = MARKETS[currency];
  const rules: PricingRules['markets'][Currency] =
    PRICING_RULES.markets[currency];
  const rows: Row[] = [];
  const byKey = new Map<string, Estimate>();
  for (const answers of allAnswers()) {
    const result = estimate(answers, target);
    const key = answersQuery(answers);
    rows.push({ answers, result, key });
    byKey.set(key, result);
  }
  const neighbours = rows.map(({ answers }) =>
    upgrades(answers).map((next) => {
      const after = byKey.get(answersQuery(next));
      if (!after) throw new Error('outside the answer space');
      return { next, after };
    }),
  );

  function violations(check: (row: Row, index: number) => string[]): string[] {
    return rows.flatMap((row, index) => check(row, index));
  }

  it('covers the whole answer space exactly once', () => {
    expect(rows).toHaveLength(byKey.size);
    expect(byKey.size).toBe(3 * 2 ** TOOL_IDS.length * 4 * 2 * 2 * 3 * 2);
  });

  it('P1 keeps every line between its floor and its cap', () => {
    expect(
      violations(({ result, key }) =>
        result.lines.flatMap((line) => {
          const [price] = target.ladder[line.id].prices;
          const cap = price.max ?? rules.components[line.id].cap ?? Infinity;
          const onStep = (value: number) =>
            value % rules.step === 0 || value === price.min || value === cap;
          const ok =
            line.min >= price.min &&
            line.min <= line.max &&
            line.max <= cap &&
            onStep(line.min) &&
            onStep(line.max) &&
            (!line.capped || line.max === cap);
          return ok ? [] : [`${key} ${line.id}`];
        }),
      ),
    ).toEqual([]);
  });

  it('P2 never goes below the ladder floors', () => {
    expect(
      violations(({ result, key }) => {
        const floors = result.lines.reduce(
          (sum, line) => sum + target.ladder[line.id].prices[0].min,
          0,
        );
        const primary = result.lines.find((line) => !line.addOn);
        const ok =
          result.total.min >= floors &&
          result.total.max >= result.total.min &&
          primary !== undefined &&
          primary.min >= target.ladder[primary.id].prices[0].min;
        return ok ? [] : [key];
      }),
    ).toEqual([]);
  });

  it('P3 stays inside the published agent range', () => {
    const published = target.ladder.agent.prices[0];
    expect(
      violations(({ result, key }) =>
        result.lines.some(
          (line) => line.id === 'agent' && line.max > (published.max ?? 0),
        )
          ? [key]
          : [],
      ),
    ).toEqual([]);
  });

  it('P4 never lowers the price when the scope grows', () => {
    expect(
      violations(({ result, key }, index) => {
        const before = byLine(result);
        return (neighbours[index] ?? []).flatMap(({ next, after }) => {
          const lines = byLine(after);
          const ok =
            after.total.min >= result.total.min &&
            after.total.max >= result.total.max &&
            [...before].every(([id, line]) => {
              const grown = lines.get(id);
              return (
                grown !== undefined &&
                grown.min >= line.min &&
                grown.max >= line.max
              );
            });
          return ok ? [] : [`${key} -> ${answersQuery(next)}`];
        });
      }),
    ).toEqual([]);
  });

  it('P5 keeps the timeline sensible', () => {
    expect(
      violations(({ answers, result, key }, index) => {
        const sane =
          result.weeks.min >= 2 && result.weeks.max >= result.weeks.min;
        const moves = (neighbours[index] ?? []).flatMap(({ next, after }) => {
          const ok =
            next.urgency !== answers.urgency
              ? after.weeks.min <= result.weeks.min &&
                after.weeks.max <= result.weeks.max
              : after.weeks.min >= result.weeks.min &&
                after.weeks.max >= result.weeks.max;
          return ok ? [] : [`${key} -> ${answersQuery(next)}`];
        });
        return sane ? moves : [`${key} weeks`, ...moves];
      }),
    ).toEqual([]);
  });

  it('P6 keeps maintenance a ladder tier that only grows with scope', () => {
    expect(
      violations(({ answers, result, key }, index) => {
        const listed = target.ladder.maintenance.prices.some(
          (price) => price.id === result.maintenance.price.id,
        );
        const toggled = byKey.get(
          answersQuery({ ...answers, maintenance: !answers.maintenance }),
        );
        const stable =
          toggled !== undefined &&
          toggled.total.min === result.total.min &&
          toggled.total.max === result.total.max &&
          toggled.weeks.min === result.weeks.min &&
          toggled.weeks.max === result.weeks.max &&
          JSON.stringify(toggled.lines) === JSON.stringify(result.lines);
        const grows = (neighbours[index] ?? []).every(
          ({ next, after }) =>
            next.urgency !== answers.urgency ||
            TIER_RANK[after.maintenance.tier] >=
              TIER_RANK[result.maintenance.tier],
        );
        return listed &&
          stable &&
          grows &&
          result.maintenance.wanted === answers.maintenance
          ? []
          : [key];
      }),
    ).toEqual([]);
  });

  it('P7 states the market currency and the ladder floors', () => {
    expect(
      violations(({ result, key }) =>
        result.currency === currency &&
        result.rulesVersion === PRICING_RULES.version &&
        result.lines.every(
          (line) =>
            line.min >= target.ladder[line.id].prices[0].min &&
            target.ladder[line.id].prices[0].currency === currency,
        )
          ? []
          : [key],
      ),
    ).toEqual([]);
  });

  it('P8 is deterministic and treats tools as a set', () => {
    expect(
      violations(({ answers, result, key }, index) => {
        if (index % 7 !== 0) return [];
        const shuffled = {
          ...answers,
          tools: [...answers.tools, ...answers.tools].reverse(),
        };
        return JSON.stringify(estimate(shuffled, target)) ===
          JSON.stringify(result) &&
          JSON.stringify(estimate(answers, target)) === JSON.stringify(result)
          ? []
          : [key];
      }),
    ).toEqual([]);
  });
});

describe('the ladder', () => {
  it.each([
    ['en', 'SGD'],
    ['es', 'EUR'],
  ] as const)('has the three maintenance tiers in %s', (locale, currency) => {
    expect(CURRENCY[locale]).toBe(currency);
    const ids = SERVICES[locale].maintenance.prices.map((price) => price.id);
    expect(ids).toEqual([
      'maintenance-essential',
      'maintenance-standard',
      'maintenance-extended',
    ]);
  });
});

describe('rules sanity', () => {
  const { shared, markets } = PRICING_RULES;

  function isHalf(value: number): boolean {
    return Number.isFinite(value) && Number.isInteger(value * 2);
  }

  it('keeps volume uplifts whole and strictly increasing', () => {
    const values = VOLUMES.map((volume) => shared.volumePercent[volume]);
    expect(values.every(Number.isInteger)).toBe(true);
    expect(
      values.every((value, i) => i === 0 || value > (values[i - 1] ?? 0)),
    ).toBe(true);
    expect(values[0]).toBeGreaterThanOrEqual(0);
  });

  it('keeps urgency price rising and the timeline shrinking', () => {
    const prices = URGENCIES.map((u) => shared.urgency[u].pricePercent);
    const weeks = URGENCIES.map((u) => shared.urgency[u].weeksPercent);
    expect(prices.every(Number.isInteger)).toBe(true);
    expect(weeks.every(Number.isInteger)).toBe(true);
    expect(
      prices.every((value, i) => i === 0 || value > (prices[i - 1] ?? 0)),
    ).toBe(true);
    expect(
      weeks.every((value, i) => i === 0 || value < (weeks[i - 1] ?? 0)),
    ).toBe(true);
    expect(100 + (weeks.at(-1) ?? 0)).toBeGreaterThan(0);
    expect(100 + (prices[0] ?? 0)).toBeGreaterThan(0);
  });

  it('orders every range and keeps weeks in halves', () => {
    for (const component of COMPONENTS) {
      const time = shared.components[component];
      expect(Number.isInteger(time.includedTools)).toBe(true);
      for (const range of [
        time.weeks,
        time.weeksPerTool,
        time.weeksPerCustom,
      ]) {
        expect(range.every(isHalf)).toBe(true);
        expect(range[0]).toBeLessThanOrEqual(range[1]);
        expect(range[0]).toBeGreaterThanOrEqual(0);
      }
    }
    expect(Number.isInteger(shared.addOnWeeksPercent)).toBe(true);
  });

  it.each(CURRENCIES)(
    'keeps the %s money coherent with the ladder',
    (currency) => {
      const { step, components } = markets[currency];
      const ladder = MARKETS[currency].ladder;
      expect(Number.isInteger(step)).toBe(true);
      for (const component of COMPONENTS) {
        const money: PricingRules['markets'][Currency]['components'][ProjectComponent] =
          components[component];
        const [price] = ladder[component].prices;
        for (const range of [money.perTool, money.perCustom]) {
          expect(range.every(Number.isInteger)).toBe(true);
          expect(range[0]).toBeLessThanOrEqual(range[1]);
          expect(range[0]).toBeGreaterThanOrEqual(0);
        }
        expect(Number.isInteger(money.spread)).toBe(true);
        expect(money.spread).toBeGreaterThanOrEqual(0);
        expect(price.min % step).toBe(0);
        const cap = price.max ?? money.cap;
        expect(cap, `${currency} ${component} needs a ceiling`).toBeDefined();
        if (cap === undefined) continue;
        expect(cap % step).toBe(0);
        expect(cap).toBeGreaterThanOrEqual(price.min + money.spread);
      }
    },
  );
});

describe('adversarial rules', () => {
  const hostile: PricingRules = {
    ...PRICING_RULES,
    shared: {
      ...PRICING_RULES.shared,
      urgency: {
        ...PRICING_RULES.shared.urgency,
        flexible: { pricePercent: -50, weeksPercent: 25 },
      },
    },
    markets: {
      ...PRICING_RULES.markets,
      EUR: {
        step: 500,
        components: {
          integration: {
            spread: 0,
            perTool: [0, 0],
            perCustom: [0, 0],
            cap: 4500,
          },
          agent: { spread: 0, perTool: [0, 0], perCustom: [0, 0] },
          web: { spread: 0, perTool: [0, 0], perCustom: [0, 0], cap: 6500 },
        },
      },
    },
  };

  it('clamps to the floor and the cap whatever the rules say', () => {
    const answers: CalculatorAnswers = {
      type: 'automation',
      tools: [...TOOL_IDS],
      volume: 'very-high',
      agent: false,
      web: true,
      urgency: 'flexible',
      maintenance: false,
    };
    const result = estimate(answers, { ...MARKETS.EUR, rules: hostile });
    const [integration, web] = result.lines;
    expect(integration?.min).toBeGreaterThanOrEqual(4000);
    expect(integration?.max).toBeLessThanOrEqual(4500);
    expect(web?.min).toBeGreaterThanOrEqual(6000);
    expect(web?.max).toBeLessThanOrEqual(6500);
  });
});
