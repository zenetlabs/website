import { ApprovalCard } from '@/components/approval-card';
import { FlowDiagram } from '@/components/flow-diagram';
import { Section } from '@/components/section';
import type { ApprovalCopy, FlowActor, FlowSectionCopy } from '@/content/types';

export function FlowSection({
  copy,
  actors,
  approval,
}: {
  copy: FlowSectionCopy;
  actors: Record<FlowActor, string>;
  approval?: ApprovalCopy & { caption: string };
}) {
  return (
    <Section id="flow" title={copy.title} lead={copy.lead} variant="tint">
      <FlowDiagram steps={copy.steps} actors={actors} caption={copy.caption} />
      {approval ? (
        <figure className="mt-8 max-w-md md:mt-10">
          <ApprovalCard copy={approval} />
          <figcaption className="mt-3 text-ui-s text-muted-fg">
            {approval.caption}
          </figcaption>
        </figure>
      ) : null}
    </Section>
  );
}
