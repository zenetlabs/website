import type { FlowActor, FlowStep } from '@/content/types';

export function FlowDiagram({
  steps,
  actors,
  caption,
}: {
  steps: readonly FlowStep[];
  actors: Record<FlowActor, string>;
  caption: string;
}) {
  return (
    <figure>
      <ol className="flow">
        {steps.map((step) => (
          <li
            key={step.label}
            data-actor={step.actor}
            className="rounded-input p-3 md:p-4"
          >
            <p className="flex items-center gap-2 font-mono text-label font-medium uppercase text-fg-soft">
              <span aria-hidden="true" className={`icon icon-${step.actor}`} />
              {actors[step.actor]}
            </p>
            <p className="mt-1 text-ui-m font-medium md:mt-2">{step.label}</p>
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 text-ui-s text-muted-fg">
        {caption}
      </figcaption>
    </figure>
  );
}
