// Text helpers the chat guards and the message reads share.

// Lower case without accents: "Miércoles" and "miercoles" read the same. Each
// accented letter is one code unit before and after, so indices carry over.
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// The same fold, one code unit for one code unit, so a position found in it
// is the same position in the original: an accented letter becomes its base
// letter, and anything that would change length (an emoji's variation
// selector, a keycap mark, a letter that lower-cases to two) stays as it is.
export function foldInPlace(text: string): string {
  let out = '';
  for (const unit of text) {
    const lower = unit.toLowerCase();
    const base = lower.normalize('NFD').replace(/\p{M}/gu, '');
    out +=
      unit.length !== 1 || lower.length !== 1
        ? unit
        : base.length === 1
          ? base
          : lower;
  }
  return out;
}

// A whole word or phrase, as a pattern: no letter or digit on either side.
export function wordPattern(needle: string, flags = 'u'): RegExp {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, flags);
}

export function hasWord(haystack: string, needle: string): boolean {
  return wordPattern(needle).test(haystack);
}
