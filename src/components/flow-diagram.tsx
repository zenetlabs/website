import { ApprovalCard } from '@/components/approval-card';
import { FlowTileMark } from '@/components/offer-system';
import type {
  ApprovalCopy,
  FlowActor,
  FlowStep,
  FlowTile,
} from '@/content/types';

function tileOf(step: FlowStep): FlowTile {
  if (step.actor === 'tool') return step.tool ?? 'app';
  return step.actor;
}

// A process drawn as it runs: the customer's tool, our agent, then the person
// who decides, one row each and joined by a wire. The text carries it all; the
// tiles are decoration.
export function FlowDiagram({
  steps,
  actors,
  caption,
  approval,
  className = '',
}: {
  steps: readonly FlowStep[];
  actors: Record<FlowActor, string>;
  caption: string;
  approval?: ApprovalCopy & { caption: string };
  className?: string;
}) {
  return (
    <figure className={`flow-figure ${className}`}>
      <figcaption className="flow-figure-head">{caption}</figcaption>
      <ol className="flow-steps">
        {steps.map((step) => (
          <li key={step.label} data-actor={step.actor}>
            <FlowTileMark tile={tileOf(step)} />
            <div className="min-w-0">
              <p className="flow-step-actor">{actors[step.actor]}</p>
              <p className="flow-step-label">{step.label}</p>
              {approval && step.actor === 'human' ? (
                <div className="mt-3">
                  <ApprovalCard copy={approval} />
                  <p className="mt-2 text-ui-s text-muted-fg">
                    {approval.caption}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
