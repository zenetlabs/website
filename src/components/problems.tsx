import { FlowRow } from '@/components/offer-system';
import { Section } from '@/components/section';
import { H3 } from '@/components/ui';
import type { FlowTile, HomeContent } from '@/content/types';

type JobId = HomeContent['problems']['items'][number]['id'];

// Who does each job once it runs: an order only moves between tools; an
// invoice and a customer question go through the agent and end at a person.
const FLOWS: Record<JobId, readonly FlowTile[]> = {
  orders: ['shopify', 'xero', 'sheets'],
  invoices: ['gmail', 'agent', 'human'],
  customers: ['whatsapp', 'agent', 'human'],
};

export function Problems({ copy }: { copy: HomeContent['problems'] }) {
  return (
    <Section id="problems" title={copy.title} variant="tint">
      <ul className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {copy.items.map((item) => (
          <li key={item.id} className="job-card">
            <FlowRow tiles={FLOWS[item.id]} className="max-md:hidden" />
            <h3 className={H3}>{item.title}</h3>
            <p className="text-ui-m text-fg-soft">
              <span className="font-semibold text-fg">{copy.todayLabel}:</span>{' '}
              {item.problem}
            </p>
            <p className="text-ui-m">
              <span aria-hidden="true" className="icon icon-check job-check" />
              <span className="font-semibold">{copy.fixLabel}:</span> {item.fix}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
