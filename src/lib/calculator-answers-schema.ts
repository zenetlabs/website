import { z } from 'zod';
import {
  type CalculatorAnswers,
  PROJECT_TYPES,
  TOOL_IDS,
  URGENCIES,
  VOLUMES,
} from '@/lib/calculator-answers';

// Kept apart from calculator-answers.ts so the client never ships zod for it.
export const calculatorAnswersSchema: z.ZodType<CalculatorAnswers> = z.object({
  type: z
    .enum(PROJECT_TYPES)
    .describe('Main kind of project: automation, agent (AI agent) or web.'),
  tools: z
    .array(z.enum(TOOL_IDS))
    .max(TOOL_IDS.length)
    .describe(
      'Kinds of tool the company wants connected: erp, shop, crm, messaging, sheets, documents, custom or other.',
    ),
  volume: z
    .enum(VOLUMES)
    .describe(
      'Monthly volume of orders or documents: low, medium, high or very-high.',
    ),
  agent: z.boolean().describe('True if the project includes an AI agent.'),
  web: z.boolean().describe('True if the project includes a website or app.'),
  urgency: z
    .enum(URGENCIES)
    .describe('How soon they need it: flexible, standard or urgent.'),
  maintenance: z
    .boolean()
    .describe('True if they want a monthly maintenance plan.'),
});
