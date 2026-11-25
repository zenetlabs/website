import type { AssistantIntro, FaqItem } from '@/content/types';

// The first two questions of a page's FAQ, as the chips of its closing desk.
export function faqChips(
  items: readonly FaqItem[],
): AssistantIntro['suggestions'] | undefined {
  const [first, second] = items;
  return first && second ? [first.question, second.question] : undefined;
}
