import { type FormEvent, type ReactNode, type Ref, useId } from 'react';
import { CARD, EYEBROW, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type {
  CalculatorOption,
  CalculatorPageContent,
  Services,
} from '@/content/types';
import {
  answersFromForm,
  type CalculatorAnswers,
  type CalculatorSearch,
  PROJECT_TYPES,
  TOOL_IDS,
  URGENCIES,
  VOLUMES,
} from '@/lib/calculator-answers';
import {
  adjustmentsText,
  diagnosticText,
  lineDriver,
  maintenanceText,
  rangeText,
  roundingText,
  weeksText,
} from '@/lib/calculator-text';
import type { Estimate } from '@/lib/estimate';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

const OPTION =
  'flex min-h-11 cursor-pointer items-start gap-3 rounded-input border border-hairline bg-surface px-4 py-2.5 has-checked:border-accent';
const INPUT = 'mt-1 size-4 shrink-0 accent-accent';

function Option({
  kind,
  name,
  value,
  option,
  checked,
  required,
}: {
  kind: 'radio' | 'checkbox';
  name: string;
  value: string;
  option: CalculatorOption;
  checked: boolean;
  required?: boolean;
}) {
  const hintId = `${name}-${value}-hint`;
  return (
    <label className={OPTION}>
      <input
        type={kind}
        name={name}
        value={value}
        defaultChecked={checked}
        required={required}
        aria-describedby={option.hint ? hintId : undefined}
        className={INPUT}
      />
      <span>
        {option.label}
        {option.hint ? (
          <span id={hintId} className="block text-sm text-muted-fg">
            {option.hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Question({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  const hintId = useId();
  return (
    <fieldset
      aria-describedby={hint ? hintId : undefined}
      className="grid gap-3 border-t border-hairline pt-6"
    >
      <legend className="font-display text-2xl leading-tight">{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-fg">
          {hint}
        </p>
      ) : null}
      {children}
    </fieldset>
  );
}

export function CalculatorForm({
  copy,
  locale,
  search,
  onAnswers,
}: {
  copy: CalculatorPageContent;
  locale: Locale;
  search: CalculatorSearch;
  onAnswers: (answers: CalculatorAnswers) => Promise<void>;
}) {
  const { questions } = copy;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    const answers = answersFromForm(new FormData(event.currentTarget));
    if (answers === null) return;
    event.preventDefault();
    await onAnswers(answers);
  }

  return (
    <form
      id="questions"
      method="get"
      action={`${pagePath(locale, 'calculator')}#estimate`}
      onSubmit={onSubmit}
      className="grid gap-8"
    >
      <Question legend={questions.type.legend}>
        {PROJECT_TYPES.map((id) => (
          <Option
            key={id}
            kind="radio"
            name="type"
            value={id}
            option={questions.type.options[id]}
            checked={search.type === id}
            required
          />
        ))}
      </Question>
      <Question legend={questions.tools.legend} hint={questions.tools.hint}>
        {TOOL_IDS.map((id) => (
          <Option
            key={id}
            kind="checkbox"
            name={id}
            value="true"
            option={questions.tools.options[id]}
            checked={search[id] === true}
          />
        ))}
      </Question>
      <Question legend={questions.volume.legend}>
        {VOLUMES.map((id) => (
          <Option
            key={id}
            kind="radio"
            name="volume"
            value={id}
            option={questions.volume.options[id]}
            checked={search.volume === id}
            required
          />
        ))}
      </Question>
      <Question legend={questions.extras.legend} hint={questions.extras.hint}>
        <Option
          kind="checkbox"
          name="agent"
          value="true"
          option={questions.extras.options.agent}
          checked={search.agent === true}
        />
        <Option
          kind="checkbox"
          name="web"
          value="true"
          option={questions.extras.options.web}
          checked={search.web === true}
        />
      </Question>
      <Question legend={questions.urgency.legend}>
        {URGENCIES.map((id) => (
          <Option
            key={id}
            kind="radio"
            name="urgency"
            value={id}
            option={questions.urgency.options[id]}
            checked={(search.urgency ?? 'standard') === id}
            required
          />
        ))}
      </Question>
      <Question legend={questions.maintenance.legend}>
        <Option
          kind="radio"
          name="maintenance"
          value="true"
          option={questions.maintenance.options.yes}
          checked={search.maintenance === true}
          required
        />
        <Option
          kind="radio"
          name="maintenance"
          value="false"
          option={questions.maintenance.options.no}
          checked={search.maintenance === false}
          required
        />
      </Question>
      <div>
        <button type="submit" className={`${PRIMARY_BUTTON} w-full sm:w-fit`}>
          {copy.submit}
        </button>
      </div>
    </form>
  );
}

export function EstimatePanel({
  copy,
  locale,
  services,
  estimate,
  headingRef,
}: {
  copy: CalculatorPageContent;
  locale: Locale;
  services: Services;
  estimate: Estimate | null;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const { result } = copy;
  return (
    <section
      id="estimate"
      aria-labelledby="estimate-title"
      className={`${CARD} scroll-mt-6 p-6 md:p-8`}
    >
      <h2
        id="estimate-title"
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl outline-hidden md:text-4xl"
      >
        {result.title}
      </h2>
      {estimate ? (
        <>
          <dl className="mt-6 grid gap-5">
            <div>
              <dt className={EYEBROW}>{result.labels.total}</dt>
              <dd className="mt-1 font-mono text-xl">
                {rangeText(locale, estimate.total, estimate.currency)}
                <span className="block font-sans text-sm text-muted-fg">
                  {copy.taxNote}
                </span>
              </dd>
            </div>
            <div>
              <dt className={EYEBROW}>{result.labels.timeline}</dt>
              <dd className="mt-1">{weeksText(result, estimate.weeks)}</dd>
            </div>
            <div>
              <dt className={EYEBROW}>{result.labels.maintenance}</dt>
              <dd className="mt-1">
                {maintenanceText(locale, result, estimate)}
              </dd>
            </div>
            <div>
              <dt className={EYEBROW}>{result.labels.diagnostic}</dt>
              <dd className="mt-1">
                {diagnosticText(locale, result, services, estimate.diagnostic)}
              </dd>
            </div>
          </dl>
          <h3 className="mt-8 font-display text-2xl">{result.breakdown}</h3>
          <ul className="mt-4 grid gap-3">
            {estimate.lines.map((line) => (
              <li key={line.id} className="border-t border-hairline pt-3">
                <span className="block">{services[line.id].name}</span>
                <span className="block font-mono">
                  {rangeText(locale, line, estimate.currency)}
                </span>
                <span className="block text-sm text-muted-fg">
                  {lineDriver(result, line)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-sm">
            {adjustmentsText(result, estimate)}
          </p>
          <p className="mt-2 text-sm text-muted-fg">
            {roundingText(locale, result, estimate)}
          </p>
          {estimate.capped ? (
            <p className="mt-4 text-sm">{result.cappedNote}</p>
          ) : null}
          <p className="mt-6 text-sm text-muted-fg">{result.short}</p>
          <p className="mt-2 text-sm text-muted-fg">{result.share}</p>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <a href="#questions" className={`font-medium ${TEXT_LINK}`}>
              {result.change}
            </a>
            <a
              href={pagePath(locale, 'pricing')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.pricingLink} →
            </a>
          </p>
        </>
      ) : (
        <>
          <p className="mt-6 text-muted-fg">{result.empty}</p>
          <p className="mt-4 text-sm text-muted-fg">{result.short}</p>
        </>
      )}
    </section>
  );
}
