import type { FlowTile, HubCardPage, Services } from '@/content/types';

// The tools each service page's work usually joins: one map for the hub cards,
// and the three builds of the home offer and the pricing page take theirs.
export const PAGE_FLOWS = {
  automation: ['gmail', 'agent', 'human'],
  integrations: ['shopify', 'xero', 'sheets'],
  agents: ['whatsapp', 'agent', 'human'],
  software: ['app', 'hubspot', 'gmail'],
  training: ['sheets', 'agent', 'human'],
} as const satisfies Record<HubCardPage, readonly FlowTile[]>;

export const BUILDS = [
  { id: 'integration', flow: PAGE_FLOWS.integrations },
  { id: 'web', flow: PAGE_FLOWS.software },
  { id: 'agent', flow: PAGE_FLOWS.agents },
] as const satisfies readonly {
  id: keyof Services;
  flow: readonly FlowTile[];
}[];
