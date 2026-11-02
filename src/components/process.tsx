import { Section } from '@/components/section';
import type { SectionVariant } from '@/components/section-frame';
import { H3, PILL } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
  variant,
  price,
}: {
  copy: ProcessCopy;
  id?: string;
  variant?: SectionVariant;
  price?: string;
}) {
  return (
    <Section id={id} title={copy.title} variant={variant}>
      <ol className="timeline">
        {copy.steps.map((step, index) => (
          <li key={step.id}>
            <h3 className={H3}>{step.label}</h3>
            {price && index === 0 ? (
              <p className={`price-chip ${PILL}`}>{price}</p>
            ) : null}
            <p className="step-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
