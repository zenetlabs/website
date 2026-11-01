import type { FaqItem } from '@/content/types';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'can',
  'do',
  'does',
  'for',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'we',
  'what',
  'who',
  'you',
  'your',
  'al',
  'con',
  'cual',
  'cuál',
  'de',
  'del',
  'el',
  'en',
  'es',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'por',
  'que',
  'qué',
  'se',
  'su',
  'un',
  'una',
  'y',
]);
const MARKS = /\p{M}/gu;
const NON_WORD = /[^\p{L}\p{N}]+/u;
const PREFIX = 4;

function words(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(MARKS, '')
    .toLowerCase()
    .split(NON_WORD)
    .filter((word) => word !== '' && !STOPWORDS.has(word));
}

function hits(query: readonly string[], text: readonly string[]): number {
  return query.filter((word) =>
    text.some(
      (candidate) =>
        candidate === word ||
        (word.length >= PREFIX && candidate.startsWith(word)) ||
        (candidate.length >= PREFIX && word.startsWith(candidate)),
    ),
  ).length;
}

export function searchFaq(
  items: readonly FaqItem[],
  query: string,
  limit: number,
): FaqItem[] {
  const wanted = words(query);
  if (wanted.length === 0) return [];
  return items
    .map((item, index) => ({
      item,
      index,
      score:
        3 * hits(wanted, words(item.question)) +
        hits(wanted, words(item.answer)),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
}
