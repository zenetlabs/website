import { describe, expect, it } from 'vitest';
import { faqChips } from '@/lib/faq-chips';

const item = (id: string) => ({ id, question: `Q ${id}?`, answer: 'A' });

describe('faqChips', () => {
  it('takes the first two questions', () => {
    expect(faqChips([item('a'), item('b'), item('c')])).toEqual([
      'Q a?',
      'Q b?',
    ]);
  });

  it('gives none for fewer than two', () => {
    expect(faqChips([item('a')])).toBeUndefined();
    expect(faqChips([])).toBeUndefined();
  });
});
