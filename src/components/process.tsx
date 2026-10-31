import { Section } from '@/components/section';
import type { ProcessCopy } from '@/content/types';

export function Process({
  copy,
  id = 'process',
}: {
  copy: ProcessCopy;
  id?: string;
}) {
  return (
    <Section id={id} eyebrow={copy.eyebrow} title={copy.title}>
      <ol className="timeline">
        {copy.steps.map((step) => (
          <li key={step.id}>
            <h3 className="font-mono text-sm font-medium uppercase tracking-[0.08em]">
              {step.label}
            </h3>
            <p className="mt-3 text-muted-fg">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
