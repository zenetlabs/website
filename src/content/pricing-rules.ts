import type { PricingRules } from '@/content/types';

// Deterministic rules behind the price calculator (src/lib/estimate.ts).
// Floors, the agent maximum, the maintenance tiers and the diagnostic come from
// src/content/{en,es}/services.ts and are not repeated here.
// Percentages are whole numbers: 10 means +10%. Money is in the market's own
// currency. Bump `version` on every edit and update the goldens in
// src/lib/estimate.test.ts. Never write a formatted price in a comment.
export const PRICING_RULES = {
  version: '2026-11-01',
  shared: {
    // TODO(albert): uplift on every line by orders, documents or messages per month
    volumePercent: { low: 0, medium: 10, high: 25, 'very-high': 40 },
    urgency: {
      // TODO(albert): "No rush" lowers the price by 5%; the ladder price is the floor
      flexible: { pricePercent: -5, weeksPercent: 25 },
      standard: { pricePercent: 0, weeksPercent: 0 },
      // TODO(albert): "As soon as possible" adds 20% and shortens the timeline by a quarter
      urgent: { pricePercent: 20, weeksPercent: -25 },
    },
    // TODO(albert): an add-on adds half its own timeline because the work overlaps
    addOnWeeksPercent: 50,
    components: {
      integration: {
        includedTools: 2, // TODO(albert)
        weeks: [3, 5], // TODO(albert)
        weeksPerTool: [0.5, 1], // TODO(albert)
        weeksPerCustom: [1, 2], // TODO(albert)
      },
      agent: {
        includedTools: 1, // TODO(albert)
        weeks: [5, 8], // TODO(albert)
        weeksPerTool: [0.5, 1], // TODO(albert)
        weeksPerCustom: [1, 2], // TODO(albert)
      },
      web: {
        includedTools: 0, // TODO(albert)
        weeks: [5, 8], // TODO(albert)
        weeksPerTool: [0.5, 1], // TODO(albert)
        weeksPerCustom: [1, 2], // TODO(albert)
      },
    },
    // TODO(albert): Standard from 3 tools, from high volume or with 2+ components; Extended whenever an agent is included
    maintenance: { standardFromTools: 3, standardFromVolume: 'high' },
  },
  markets: {
    EUR: {
      step: 500, // TODO(albert)
      components: {
        integration: {
          spread: 2000, // TODO(albert)
          perTool: [1000, 1500], // TODO(albert)
          perCustom: [2000, 3000], // TODO(albert)
          cap: 15000, // TODO(albert)
        },
        // TODO(albert): the agent ceiling is the published ladder maximum
        agent: {
          spread: 3000, // TODO(albert)
          perTool: [1000, 1500], // TODO(albert)
          perCustom: [2000, 3000], // TODO(albert)
        },
        web: {
          spread: 3000, // TODO(albert)
          perTool: [1000, 1500], // TODO(albert)
          perCustom: [2000, 3000], // TODO(albert)
          cap: 20000, // TODO(albert)
        },
      },
    },
    SGD: {
      step: 500, // TODO(albert)
      components: {
        integration: {
          spread: 4000, // TODO(albert)
          perTool: [2000, 3000], // TODO(albert)
          perCustom: [4000, 6000], // TODO(albert)
          cap: 30000, // TODO(albert)
        },
        // TODO(albert): the agent ceiling is the published ladder maximum
        agent: {
          spread: 6000, // TODO(albert)
          perTool: [2000, 3000], // TODO(albert)
          perCustom: [4000, 6000], // TODO(albert)
        },
        web: {
          spread: 6000, // TODO(albert)
          perTool: [2000, 3000], // TODO(albert)
          perCustom: [4000, 6000], // TODO(albert)
          cap: 40000, // TODO(albert)
        },
      },
    },
  },
} satisfies PricingRules;
