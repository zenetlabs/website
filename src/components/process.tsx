import { Section } from '@/components/section';
import type { SectionVariant } from '@/components/section-frame';
import { H3 } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

// With `rail`, one step is the ticket's stub, torn along a perforation: the
// first by default, or the one at `stub`.
export function Process({
  copy,
  id = 'process',
  rail = false,
  stub = 0,
  variant,
}: {
  copy: ProcessCopy;
  id?: string;
  rail?: boolean;
  stub?: number;
  variant?: SectionVariant;
}) {
  return (
    <Section id={id} title={copy.title} variant={variant}>
      <ol
        className={rail ? 'rail' : 'timeline'}
        style={rail ? { '--rail-cols': copy.steps.length } : undefined}
      >
        {copy.steps.map((step, index) => (
          <li key={step.id} data-stub={rail && index === stub ? '' : undefined}>
            <h3 className={H3}>{step.label}</h3>
            <p className="step-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
