import { fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CalculatorForm, EstimatePanel } from '@/components/calculator';
import { calculatorPage as enCopy } from '@/content/en/calculator';
import { calculatorPage as esCopy } from '@/content/es/calculator';
import type { CalculatorPageContent } from '@/content/types';
import {
  answersQuery,
  type CalculatorAnswers,
  type CalculatorSearch,
  PROJECT_TYPES,
  searchFromAnswers,
  TOOL_IDS,
  URGENCIES,
  VOLUMES,
} from '@/lib/calculator-answers';
import { leadMessage } from '@/lib/calculator-text';
import { estimate, market } from '@/lib/estimate';
import type { Locale } from '@/lib/i18n';
import { G5 } from '../../test/calculator-fixtures';
import { SERVICES } from '../../test/page-content';

const COPY: Record<Locale, CalculatorPageContent> = { en: enCopy, es: esCopy };
const CURRENCY = { en: 'SGD', es: 'EUR' } as const;

const BASE: CalculatorAnswers = {
  type: 'automation',
  tools: ['shop', 'erp'],
  volume: 'medium',
  agent: false,
  web: false,
  urgency: 'standard',
  maintenance: true,
};

function renderForm(
  locale: Locale,
  search: CalculatorSearch = {},
  onAnswers: (answers: CalculatorAnswers) => Promise<void> = async () => {},
) {
  const view = render(
    <CalculatorForm
      copy={COPY[locale]}
      locale={locale}
      search={search}
      onAnswers={onAnswers}
    />,
  );
  const form = view.container.querySelector('form');
  if (!form) throw new Error('no form');
  return form;
}

function choose(form: HTMLFormElement, answers: CalculatorAnswers) {
  for (const input of form.querySelectorAll('input')) {
    if (input.type === 'checkbox') {
      input.checked =
        input.name === 'agent'
          ? answers.agent
          : input.name === 'web'
            ? answers.web
            : TOOL_IDS.some(
                (id) => id === input.name && answers.tools.includes(id),
              );
    } else {
      const wanted = {
        type: answers.type,
        volume: answers.volume,
        urgency: answers.urgency,
        maintenance: String(answers.maintenance),
      }[input.name];
      input.checked = input.value === wanted;
    }
  }
}

function queryOf(form: HTMLFormElement): string {
  const entries: [string, string][] = [];
  for (const [key, value] of new FormData(form)) {
    if (typeof value === 'string') entries.push([key, value]);
  }
  return new URLSearchParams(entries).toString();
}

describe.each(['en', 'es'] as const)('CalculatorForm (%s)', (locale) => {
  it('submits the same query the router writes, in the same key order', () => {
    const form = renderForm(locale);
    const failures: string[] = [];
    for (let mask = 0; mask < 2 ** TOOL_IDS.length; mask += 1) {
      const answers = {
        ...BASE,
        tools: TOOL_IDS.filter((_, bit) => (mask >> bit) % 2 === 1),
      };
      choose(form, answers);
      if (queryOf(form) !== answersQuery(answers)) failures.push(`${mask}`);
    }
    for (const type of PROJECT_TYPES) {
      for (const volume of VOLUMES) {
        for (const urgency of URGENCIES) {
          for (const agent of [false, true]) {
            for (const web of [false, true]) {
              for (const maintenance of [false, true]) {
                const answers = {
                  type,
                  tools: ['crm', 'custom'] as const,
                  volume,
                  agent,
                  web,
                  urgency,
                  maintenance,
                };
                choose(form, answers);
                if (queryOf(form) !== answersQuery(answers)) {
                  failures.push(answersQuery(answers));
                }
              }
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('is a plain GET form that lands on the result', () => {
    const form = renderForm(locale);
    expect(form).toHaveAttribute('method', 'get');
    expect(form.getAttribute('action')).toBe(
      locale === 'en'
        ? '/pricing/calculator#estimate'
        : '/es/precios/calculadora#estimate',
    );
    expect(form.querySelector('fieldset[disabled]')).toBeNull();
  });

  it('pre-checks the answers from the address and "in a few months" otherwise', () => {
    const empty = renderForm(locale);
    expect(queryOf(empty)).toBe('urgency=standard');
    const filled = renderForm(locale, searchFromAnswers(BASE));
    expect(queryOf(filled)).toBe(answersQuery(BASE));
  });

  it('labels every control, with legends and linked hints', () => {
    const form = renderForm(locale);
    for (const input of form.querySelectorAll('input')) {
      expect(input.labels?.length, input.name).toBeGreaterThan(0);
    }
    expect(form.querySelectorAll('fieldset')).toHaveLength(6);
    for (const fieldset of form.querySelectorAll('fieldset')) {
      expect(fieldset.querySelector('legend')?.textContent).toBeTruthy();
    }
    const tools = COPY[locale].questions.tools;
    const erp = within(form).getByLabelText(
      new RegExp(tools.options.erp.label),
    );
    const hint = erp.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(hint)?.textContent).toBe(
      tools.options.erp.hint,
    );
    const group = within(form).getByRole('group', {
      name: tools.legend,
    });
    expect(
      document.getElementById(group.getAttribute('aria-describedby') ?? '')
        ?.textContent,
    ).toBe(tools.hint);
  });

  it('hands complete answers to the page instead of reloading', () => {
    const onAnswers = vi.fn(async () => {});
    const form = renderForm(locale, searchFromAnswers(BASE), onAnswers);
    expect(fireEvent.submit(form)).toBe(false);
    expect(onAnswers).toHaveBeenCalledWith({
      ...BASE,
      tools: ['erp', 'shop'],
    });
  });

  it('leaves an incomplete form to the browser', () => {
    const onAnswers = vi.fn(async () => {});
    const form = renderForm(locale, {}, onAnswers);
    expect(fireEvent.submit(form)).toBe(true);
    expect(onAnswers).not.toHaveBeenCalled();
  });
});

describe.each(['en', 'es'] as const)('EstimatePanel (%s)', (locale) => {
  const copy = COPY[locale];
  const services = SERVICES[locale];
  const target = market(CURRENCY[locale], services);

  function panel(answers: CalculatorAnswers | null) {
    const ref = createRef<HTMLHeadingElement>();
    const view = render(
      <EstimatePanel
        copy={copy}
        locale={locale}
        services={services}
        estimate={answers && estimate(answers, target)}
        headingRef={ref}
      />,
    );
    return { ...view, ref };
  }

  it('always renders the focusable heading, with the empty state first', () => {
    const { ref } = panel(null);
    const heading = screen.getByRole('heading', { name: copy.result.title });
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).toHaveAttribute('id', 'estimate-title');
    expect(ref.current).toBe(heading);
    expect(screen.getByText(copy.result.empty)).toBeInTheDocument();
    expect(screen.getByText(copy.result.short)).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows the range, timeline, maintenance, first step and breakdown', () => {
    panel(BASE);
    const total = locale === 'en' ? 'S$8,500–13,500' : '4.000–7.000 €';
    expect(
      screen.getAllByText(total, { exact: false, normalizer: (text) => text }),
    ).toHaveLength(2);
    expect(
      screen.getByText(copy.result.weeks.replace('{min}–{max}', '3–5')),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(copy.taxNote)).toBeInTheDocument();
    expect(
      screen.getByText(copy.result.tools.many.replace('{n}', '2')),
    ).toBeInTheDocument();
    expect(screen.queryByText(copy.result.cappedNote)).toBeNull();
  });

  it('explains the volume and urgency adjustments with a real minus sign', () => {
    panel({ ...BASE, volume: 'high', urgency: 'flexible' });
    const percent = (sign: string, n: number) =>
      copy.result.percent.replace('{sign}', sign).replace('{n}', `${n}`);
    expect(
      screen.getByText(
        `${copy.result.volume} ${percent('+', 25)} · ${copy.result.urgency} ${percent('−', 5)}`,
      ),
    ).toBeInTheDocument();
    panel(BASE);
    expect(
      screen.getByText(
        `${copy.result.volume} ${percent('+', 10)} · ${copy.result.urgency} ${copy.result.noChange}`,
      ),
    ).toBeInTheDocument();
  });

  it('flags a capped estimate', () => {
    panel({
      type: 'agent',
      tools: [...TOOL_IDS],
      volume: 'very-high',
      agent: true,
      web: true,
      urgency: 'urgent',
      maintenance: true,
    });
    expect(screen.getByText(copy.result.cappedNote)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.getByText(copy.result.addOn, { exact: false }),
    ).toBeInTheDocument();
  });

  it('says maintenance is not included when it was declined', () => {
    panel({ ...BASE, maintenance: false });
    const text = screen.getByText(
      copy.result.maintenanceNotWanted.split('{plan}')[0] ?? '',
      { exact: false },
    );
    expect(text).toBeInTheDocument();
    expect(screen.queryByText(/\{[a-z]+\}/)).toBeNull();
  });

  it('links back to the questions and to the price list', () => {
    panel(BASE);
    expect(
      screen.getByRole('link', { name: copy.result.change }),
    ).toHaveAttribute('href', '#questions');
    expect(
      screen.getByRole('link', { name: `${copy.pricingLink} →` }),
    ).toHaveAttribute('href', locale === 'en' ? '/pricing' : '/es/precios');
  });
});

describe.each(['en', 'es'] as const)('leadMessage (%s)', (locale) => {
  it('summarises the estimate and answers and leaves room for a note', () => {
    const copy = COPY[locale];
    const services = SERVICES[locale];
    const result = estimate(BASE, market(CURRENCY[locale], services));
    const message = leadMessage({
      locale,
      copy,
      services,
      answers: BASE,
      estimate: result,
    });
    expect(message.length).toBeLessThan(5000);
    expect(message).toContain(result.rulesVersion);
    expect(message).toContain(copy.questions.tools.options.erp.label);
    expect(message).toContain('https://zenetlabs.com');
    expect(message).toContain(`?${answersQuery(BASE)}#estimate`);
    expect(message).not.toMatch(/\{[a-z]+\}/);
    expect(message.endsWith('\n\n')).toBe(true);
  });

  it('fits the largest answer set in the contact form message limit', () => {
    const copy = COPY[locale];
    const services = SERVICES[locale];
    const message = leadMessage({
      locale,
      copy,
      services,
      answers: G5,
      estimate: estimate(G5, market(CURRENCY[locale], services)),
    });
    expect(G5.tools).toHaveLength(TOOL_IDS.length);
    expect(message.length).toBeLessThanOrEqual(5000);
  });

  it('refuses a maintenance price without a plan name', () => {
    const copy = COPY[locale];
    const services = SERVICES[locale];
    const result = estimate(BASE, market(CURRENCY[locale], services));
    const { label: _label, ...unnamed } = result.maintenance.price;
    expect(() =>
      leadMessage({
        locale,
        copy,
        services,
        answers: BASE,
        estimate: {
          ...result,
          maintenance: { ...result.maintenance, price: unnamed },
        },
      }),
    ).toThrow('No label for');
  });
});
