import {
  type CalculatorAnswers,
  PROJECT_TYPES,
  TOOL_IDS,
  URGENCIES,
  VOLUMES,
} from '@/lib/calculator-answers';

export const G1: CalculatorAnswers = {
  type: 'automation',
  tools: ['shop', 'erp'],
  volume: 'medium',
  agent: false,
  web: false,
  urgency: 'standard',
  maintenance: true,
};

export const G2: CalculatorAnswers = {
  type: 'automation',
  tools: ['erp', 'shop', 'crm', 'sheets'],
  volume: 'high',
  agent: true,
  web: false,
  urgency: 'standard',
  maintenance: true,
};

export const G3: CalculatorAnswers = {
  type: 'agent',
  tools: ['crm', 'messaging'],
  volume: 'medium',
  agent: false,
  web: false,
  urgency: 'urgent',
  maintenance: true,
};

export const G4: CalculatorAnswers = {
  type: 'web',
  tools: [],
  volume: 'low',
  agent: false,
  web: false,
  urgency: 'flexible',
  maintenance: false,
};

export const G5: CalculatorAnswers = {
  type: 'agent',
  tools: [...TOOL_IDS],
  volume: 'very-high',
  agent: true,
  web: true,
  urgency: 'urgent',
  maintenance: true,
};

export const G6: CalculatorAnswers = {
  type: 'automation',
  tools: ['erp', 'custom', 'sheets'],
  volume: 'low',
  agent: false,
  web: false,
  urgency: 'standard',
  maintenance: false,
};

export const ANSWER_SPACE = 3 * 2 ** TOOL_IDS.length * 4 * 2 * 2 * 3 * 2;

export function* allAnswers(): Generator<CalculatorAnswers> {
  for (const type of PROJECT_TYPES) {
    for (let mask = 0; mask < 2 ** TOOL_IDS.length; mask += 1) {
      const tools = TOOL_IDS.filter((_, bit) => (mask >> bit) % 2 === 1);
      for (const volume of VOLUMES) {
        for (const agent of [false, true]) {
          for (const web of [false, true]) {
            for (const urgency of URGENCIES) {
              for (const maintenance of [false, true]) {
                yield { type, tools, volume, agent, web, urgency, maintenance };
              }
            }
          }
        }
      }
    }
  }
}
