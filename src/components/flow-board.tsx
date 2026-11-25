import { ApprovalCard } from '@/components/approval-card';
import {
  BoardHop,
  BoardNode,
  BoardPacket,
  BoardPing,
} from '@/components/board-parts';
import type { ApprovalCopy, CaseFlow, FlowActor } from '@/content/types';
import { tileOf } from '@/lib/flow-tile';

// The hero's board plays the page's own flow once, as the switchboard does:
// a ping on each step, a packet along each wire, then the approval card. The
// markup is its final frame; the motion is CSS only (app.css, [data-flow-board]).
export function FlowBoard({
  flow,
  actors,
  approval,
}: {
  flow: CaseFlow;
  actors: Record<FlowActor, string>;
  approval?: ApprovalCopy & { caption: string };
}) {
  return (
    <figure
      className="flow-board"
      data-scene
      data-flow-board="lane"
      style={{ '--n': flow.steps.length }}
    >
      <figcaption className="flow-board-cap">{flow.caption}</figcaption>
      <ol className="fb-lane">
        {flow.steps.map((step, index) => {
          const next = flow.steps[index + 1];
          return (
            <li
              key={step.label}
              data-actor={step.actor}
              style={{ '--i': index }}
            >
              <BoardNode tile={tileOf(step)}>
                <BoardPing />
              </BoardNode>
              <span className="fb-text">
                <span className="fb-actor">{actors[step.actor]}</span>{' '}
                <span className="fb-step">{step.label}</span>
              </span>
              {next ? (
                <BoardHop to={next.actor}>
                  <BoardPacket />
                </BoardHop>
              ) : null}
            </li>
          );
        })}
      </ol>
      {approval ? (
        <div className="fb-after">
          <div className="fb-card">
            <ApprovalCard copy={approval} />
            <p className="mt-2 text-ui-s text-muted-fg">{approval.caption}</p>
          </div>
        </div>
      ) : null}
    </figure>
  );
}
