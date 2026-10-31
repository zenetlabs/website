import type { TitleParts } from '@/content/types';

export function titleText({ before, emphasis, after }: TitleParts): string {
  return `${before}${emphasis}${after}`;
}
