import { Section } from '@/components/section';
import { H3, PILL } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
  price,
}: {
  copy: ProcessCopy;
  id?: string;
  price?: string;
}) {
  return (
    <Section id={id} title={copy.title}>
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
