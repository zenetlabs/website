import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import {
  answersFromForm,
  answersFromSearch,
  answersQuery,
  type CalculatorAnswers,
  calculatorSearch,
  searchFromAnswers,
} from '@/lib/calculator-answers';
import { ANSWER_SPACE, allAnswers } from '../../test/calculator-fixtures';

const SAMPLE: CalculatorAnswers = {
  type: 'automation',
  tools: ['erp', 'shop'],
  volume: 'medium',
  agent: false,
  web: true,
  urgency: 'standard',
  maintenance: false,
};

describe('the answers codec', () => {
  it('survives the router round trip for every answer set, so SSR never answers 307', () => {
    const failures: string[] = [];
    let count = 0;
    for (const answers of allAnswers()) {
      count += 1;
      const query = answersQuery(answers);
      const parsed = defaultParseSearch(`?${query}`);
      const canonical = defaultStringifySearch(parsed);
      const encoded = defaultStringifySearch(searchFromAnswers(answers));
      const back = answersFromSearch(calculatorSearch(parsed));
      if (
        canonical !== `?${query}` ||
        encoded !== `?${query}` ||
        JSON.stringify(back) !== JSON.stringify(answers)
      ) {
        failures.push(query);
      }
    }
    expect(count).toBe(ANSWER_SPACE);
    expect(failures).toEqual([]);
  });

  it('writes the keys in the order of the form controls', () => {
    expect(answersQuery(SAMPLE)).toBe(
      'type=automation&erp=true&shop=true&volume=medium&web=true&urgency=standard&maintenance=false',
    );
  });

  it('keeps unrelated parameters such as campaign tags', () => {
    const parsed = defaultParseSearch(
      `?utm_source=x&gclid=y&${answersQuery(SAMPLE)}`,
    );
    expect(parsed).toMatchObject({ utm_source: 'x', gclid: 'y' });
    expect(defaultStringifySearch(parsed)).toBe(
      `?utm_source=x&gclid=y&${answersQuery(SAMPLE)}`,
    );
  });

  it('drops junk values', () => {
    const search = calculatorSearch({
      type: 'bogus',
      erp: 'on',
      volume: 1,
      agent: false,
      shop: 'false',
      urgency: ['urgent'],
      maintenance: 'maybe',
    });
    expect(
      Object.values(search).filter((value) => value !== undefined),
    ).toEqual([]);
  });

  it('accepts booleans from the parser and strings from a form', () => {
    expect(calculatorSearch({ agent: true, web: 'true' })).toMatchObject({
      agent: true,
      web: true,
    });
    expect(calculatorSearch({ maintenance: false }).maintenance).toBe(false);
    expect(calculatorSearch({ maintenance: 'false' }).maintenance).toBe(false);
  });

  it('needs the four required answers to produce a result', () => {
    expect(answersFromSearch({})).toBeNull();
    expect(answersFromSearch({ type: 'web', volume: 'low' })).toBeNull();
    expect(
      answersFromSearch({
        type: 'web',
        volume: 'low',
        urgency: 'urgent',
      }),
    ).toBeNull();
    expect(
      answersFromSearch({
        type: 'web',
        volume: 'low',
        urgency: 'urgent',
        maintenance: false,
      }),
    ).toEqual({
      type: 'web',
      tools: [],
      volume: 'low',
      agent: false,
      web: false,
      urgency: 'urgent',
      maintenance: false,
    });
  });

  it('reads answers from submitted form data', () => {
    const data = new FormData();
    for (const [key, value] of [
      ['type', 'agent'],
      ['crm', 'true'],
      ['custom', 'true'],
      ['volume', 'high'],
      ['agent', 'true'],
      ['urgency', 'flexible'],
      ['maintenance', 'true'],
    ] as const) {
      data.append(key, value);
    }
    expect(answersFromForm(data)).toEqual({
      type: 'agent',
      tools: ['crm', 'custom'],
      volume: 'high',
      agent: true,
      web: false,
      urgency: 'flexible',
      maintenance: true,
    });
    expect(answersFromForm(new FormData())).toBeNull();
  });
});
