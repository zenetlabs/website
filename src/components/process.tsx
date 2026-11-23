import { Section } from '@/components/section';
import { H3 } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
  rail = false,
}: {
  copy: ProcessCopy;
  id?: string;
  rail?: boolean;
}) {
  return (
    <Section id={id} title={copy.title}>
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
