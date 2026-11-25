import { Section } from '@/components/section';
import type { SectionVariant } from '@/components/section-frame';
import { H3 } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

// The steps as a rail. One step is the ticket's stub, torn along a perforation:
// the first by default, the one at `stub`, or none with `null`.
export function Process({
  copy,
  id = 'process',
  stub = 0,
  variant,
}: {
  copy: ProcessCopy;
  id?: string;
  stub?: number | null;
  variant?: SectionVariant;
}) {
  return (
    <Section id={id} title={copy.title} variant={variant}>
      <ol className="rail" style={{ '--rail-cols': copy.steps.length }}>
        {copy.steps.map((step, index) => (
          <li key={step.id} data-stub={index === stub ? '' : undefined}>
            <h3 className={H3}>{step.label}</h3>
            <p className="step-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
