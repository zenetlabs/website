import type { StageJob, StageTile } from '@/content/types';

// The switchboard's choreography as data, for the tests only: the ring angles
// and each job's hops (from, to, seconds after the job's beat). The page draws
// it from the `.sb*` rules in app.css, which switchboard-css.test.ts holds to
// this table, so nothing of it ships as JavaScript.
export type End = StageTile | 'core';

export const ANGLES: Record<StageTile, number> = {
  shopify: 116,
  gmail: 140,
  woocommerce: 180,
  prestashop: 220,
  whatsapp: 244,
  sheets: 64,
  xero: 27,
  hubspot: -27,
  human: -64,
};

export const JOBS: ReadonlyArray<{
  id: StageJob;
  hops: ReadonlyArray<readonly [End, End, number]>;
}> = [
  {
    id: 'orders',
    hops: [
      ['shopify', 'sheets', 0.3],
      ['shopify', 'sheets', 1.5],
    ],
  },
  {
    id: 'invoices',
    hops: [
      ['gmail', 'core', 0.3],
      ['core', 'human', 0.95],
      ['human', 'core', 1.55],
      ['core', 'xero', 2.1],
    ],
  },
  {
    id: 'customers',
    hops: [
      ['whatsapp', 'core', 0.3],
      ['core', 'whatsapp', 0.95],
      ['whatsapp', 'core', 1.5],
      ['core', 'human', 2.1],
    ],
  },
];

// A job's tiles, and its lit paths: each tile to the core, or, when the core
// takes no part (orders), the one tile straight to the other
export function jobTiles(job: (typeof JOBS)[number]): StageTile[] {
  return [...new Set(job.hops.flat())].filter(
    (end): end is StageTile => typeof end === 'string' && end !== 'core',
  );
}

export function jobPaths(
  job: (typeof JOBS)[number],
): ReadonlyArray<readonly [StageTile, End]> {
  const direct = job.hops.find((hop) => !hop.includes('core'));
  if (direct && direct[0] !== 'core') return [[direct[0], direct[1]]];
  return jobTiles(job).map((tile) => [tile, 'core'] as const);
}
