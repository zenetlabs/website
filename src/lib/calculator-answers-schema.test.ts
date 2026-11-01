import { describe, expect, it } from 'vitest';
import { calculatorAnswersSchema } from '@/lib/calculator-answers-schema';
import { G1, G2 } from '../../test/calculator-fixtures';

describe('calculatorAnswersSchema', () => {
  it('accepts the golden answers unchanged', () => {
    for (const answers of [G1, G2]) {
      expect(calculatorAnswersSchema.parse(answers)).toEqual(answers);
    }
  });

  it.each([
    ['an unknown type', { ...G1, type: 'rocket' }],
    ['an unknown tool', { ...G1, tools: ['erp', 'fax'] }],
    ['a string flag', { ...G1, agent: 'yes' }],
    ['a missing field', { ...G1, urgency: undefined }],
  ])('rejects %s', (_label, answers) => {
    expect(calculatorAnswersSchema.safeParse(answers).success).toBe(false);
  });
});
