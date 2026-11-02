import { Section, type SectionVariant } from '@/components/section';
import { H3 } from '@/components/ui';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
  variant,
}: {
  copy: ProcessCopy;
  id?: string;
  variant?: SectionVariant;
}) {
  return (
    <Section id={id} title={copy.title} variant={variant}>
      <ol className="timeline">
        {copy.steps.map((step) => (
          <li key={step.id}>
            <h3 className={H3}>{step.label}</h3>
            <p className="mt-3 text-fg-soft">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
