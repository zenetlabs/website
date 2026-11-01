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
  type: z.enum(PROJECT_TYPES),
  tools: z.array(z.enum(TOOL_IDS)).max(TOOL_IDS.length),
  volume: z.enum(VOLUMES),
  agent: z.boolean(),
  web: z.boolean(),
  urgency: z.enum(URGENCIES),
  maintenance: z.boolean(),
});
