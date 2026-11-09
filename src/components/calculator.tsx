import { type FormEvent, type ReactNode, type Ref, useId } from 'react';
import { EYEBROW, H3, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
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

type OptionProps = {
  name: string;
  value: string;
  option: CalculatorOption;
  checked: boolean;
  required?: boolean;
};

function hintIdOf({ name, value }: Pick<OptionProps, 'name' | 'value'>) {
  return `${name}-${value}-hint`;
}

function inputProps(props: OptionProps) {
  const { name, value, option, checked, required } = props;
  return {
    name,
    value,
    defaultChecked: checked,
    required,
    'aria-describedby': option.hint ? hintIdOf(props) : undefined,
  };
}

function OptionText({
  name,
  value,
  option,
}: Pick<OptionProps, 'name' | 'value' | 'option'>) {
  return (
    <span>
      {option.label}
      {option.hint ? (
        <span
          id={hintIdOf({ name, value })}
          className="block text-ui-s text-muted-fg"
        >
          {option.hint}
        </span>
      ) : null}
    </span>
  );
}

function RadioOption(props: OptionProps) {
  return (
    <label className="choice">
      <input type="radio" {...inputProps(props)} />
      <OptionText {...props} />
    </label>
  );
}

function CheckboxOption(props: OptionProps) {
  return (
    <label className="choice">
      <input type="checkbox" {...inputProps(props)} />
      <OptionText {...props} />
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
      className="grid gap-3"
    >
      <legend className={`mb-3 ${H3}`}>{legend}</legend>
      {hint ? (
        <p id={hintId} className="text-ui-s text-muted-fg">
          {hint}
        </p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
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
          <RadioOption
            key={id}
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
          <CheckboxOption
            key={id}
            name={id}
            value="true"
            option={questions.tools.options[id]}
            checked={search[id] === true}
          />
        ))}
      </Question>
      <Question legend={questions.volume.legend}>
        {VOLUMES.map((id) => (
          <RadioOption
            key={id}
            name="volume"
            value={id}
            option={questions.volume.options[id]}
            checked={search.volume === id}
            required
          />
        ))}
      </Question>
      <Question legend={questions.extras.legend} hint={questions.extras.hint}>
        <CheckboxOption
          name="agent"
          value="true"
          option={questions.extras.options.agent}
          checked={search.agent === true}
        />
        <CheckboxOption
          name="web"
          value="true"
          option={questions.extras.options.web}
          checked={search.web === true}
        />
      </Question>
      <Question legend={questions.urgency.legend}>
        {URGENCIES.map((id) => (
          <RadioOption
            key={id}
            name="urgency"
            value={id}
            option={questions.urgency.options[id]}
            checked={(search.urgency ?? 'standard') === id}
            required
          />
        ))}
      </Question>
      <Question legend={questions.maintenance.legend}>
        <RadioOption
          name="maintenance"
          value="true"
          option={questions.maintenance.options.yes}
          checked={search.maintenance === true}
          required
        />
        <RadioOption
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
      className="estimate-card"
    >
      <h2
        id="estimate-title"
        ref={headingRef}
        tabIndex={-1}
        className="text-h2-compact outline-hidden"
      >
        {result.title}
      </h2>
      {estimate ? (
        <>
          <dl className="mt-6 grid gap-5">
            <div>
              <dt className={EYEBROW}>{result.labels.total}</dt>
              <dd className="estimate-total">
                {rangeText(locale, estimate.total, estimate.currency)}
                <span className="block text-ui-s font-normal text-fg-soft">
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
          <h3 className={`mt-8 ${H3}`}>{result.breakdown}</h3>
          <ul className="mt-4 grid gap-3">
            {estimate.lines.map((line) => (
              <li key={line.id} className="border-t border-hairline pt-3">
                <span className="block">{services[line.id].name}</span>
                <span className="block font-semibold">
                  {rangeText(locale, line, estimate.currency)}
                </span>
                <span className="block text-ui-s text-muted-fg">
                  {lineDriver(result, line)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-ui-s">{adjustmentsText(result, estimate)}</p>
          <p className="mt-2 text-ui-s text-muted-fg">
            {roundingText(locale, result, estimate)}
          </p>
          {estimate.capped ? (
            <p className="mt-4 text-ui-s">{result.cappedNote}</p>
          ) : null}
          <p className="mt-6 text-ui-s text-muted-fg">{result.short}</p>
          <p className="mt-2 text-ui-s text-muted-fg">{result.share}</p>
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
          <p className="mt-4 text-ui-s text-muted-fg">{result.short}</p>
        </>
      )}
    </section>
  );
}
