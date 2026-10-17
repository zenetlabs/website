import { Section } from '@/components/section';
import { useMessages } from '@/lib/i18n';

export function Process() {
  const { process } = useMessages();

  return (
    <Section id="process" eyebrow={process.eyebrow} title={process.title}>
      <ol className="timeline">
        {Object.values(process.steps).map((step) => (
          <li key={step.label}>
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
