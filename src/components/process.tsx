import { Section } from '@/components/section';
import type { SectionVariant } from '@/components/section-frame';
import { H3 } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
  rail = false,
  variant,
}: {
  copy: ProcessCopy;
  id?: string;
  rail?: boolean;
  variant?: SectionVariant;
}) {
  return (
    <Section id={id} title={copy.title} variant={variant}>
      <ol className={rail ? 'rail' : 'timeline'}>
        {copy.steps.map((step) => (
          <li key={step.id}>
            <h3 className={H3}>{step.label}</h3>
            <p className="step-text">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
