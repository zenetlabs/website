import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FlowBoard } from '@/components/flow-board';
import { PairBoard } from '@/components/pair-board';
import { viatsy } from '@/content/es/cases';
import { SPANISH } from '../../test/landing';
import { SERVICE_BODIES } from '../../test/service-bodies';

const agents = SERVICE_BODIES.en.pages.agents;
const actors = SERVICE_BODIES.en.hub.labels.actors;

describe('FlowBoard', () => {
  function view(approval = true) {
    return render(
      <FlowBoard
        flow={agents.flow ?? viatsy.flow}
        actors={actors}
        approval={approval ? agents.approval : undefined}
      />,
    );
  }

  it('lists the steps in order with the actor word and the label as text', () => {
    const { container } = view();
    const steps = [...container.querySelectorAll('ol.fb-lane > li')];
    expect(steps).toHaveLength(agents.flow?.steps.length ?? 0);
    for (const [index, step] of steps.entries()) {
      const source = agents.flow?.steps[index];
      expect(step.textContent).toContain(source?.label ?? '');
      expect(step.textContent).toContain(actors[source?.actor ?? 'tool']);
    }
    expect(container.querySelector('figcaption')).toHaveTextContent(
      agents.flow?.caption ?? '',
    );
  });

  it('hides the decoration and draws one wire fewer than steps', () => {
    const { container } = view();
    for (const part of container.querySelectorAll(
      '.flow-tile, .fb-hop, .fb-ping',
    )) {
      expect(part.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(container.querySelectorAll('.fb-hop')).toHaveLength(2);
    expect(
      [...container.querySelectorAll('.fb-hop')].map((hop) =>
        hop.getAttribute('data-to'),
      ),
    ).toEqual(['agent', 'human']);
  });

  it('shows the approval card only when given', () => {
    expect(view().container.querySelector('.fb-after')).toHaveTextContent(
      agents.approval?.title ?? '',
    );
  });

  it('has no approval card without one', () => {
    expect(view(false).container.querySelector('.fb-after')).toBeNull();
  });
});

describe('PairBoard', () => {
  const pair = SPANISH.holdedWoocommerce;

  function view() {
    return render(
      <PairBoard shop={pair.shop} caption="Caption" rows={pair.sync.rows} />,
    );
  }

  it('hides the whole figure from assistive technology', () => {
    const { container } = view();
    expect(container.querySelector('figure')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('shows at most four rows, with the return row riding back to the shop', () => {
    const { container } = view();
    expect(container.querySelectorAll('.fb-rows > li')).toHaveLength(4);
    const packets = [...container.querySelectorAll('.fb-pk')];
    expect(packets).toHaveLength(4);
    expect(packets.map((pk) => pk.getAttribute('data-to'))).toEqual(
      pair.sync.rows.slice(0, 4).map((row) => row.to),
    );
    expect(packets.some((pk) => pk.getAttribute('data-to') === 'shop')).toBe(
      true,
    );
  });

  it('pings each row on its destination', () => {
    const { container } = view();
    const ends = container.querySelectorAll('.fb-end');
    const shopPings = ends[0]?.querySelectorAll('.fb-ping').length ?? 0;
    const holdedPings = ends[1]?.querySelectorAll('.fb-ping').length ?? 0;
    expect(shopPings + holdedPings).toBe(4);
  });
});
