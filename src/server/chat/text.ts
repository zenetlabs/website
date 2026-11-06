// Text helpers the chat guards and the message reads share.

// Lower case without accents: "Miércoles" and "miercoles" read the same. Each
// accented letter is one code unit before and after, so indices carry over.
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Folded weekday names in both languages, ISO numbered (Monday is 1).
export const WEEKDAYS: Readonly<Record<string, number>> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};

// A whole word or phrase, as a pattern: no letter or digit on either side.
export function wordPattern(needle: string, flags = 'u'): RegExp {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, flags);
}

export function hasWord(haystack: string, needle: string): boolean {
  return wordPattern(needle).test(haystack);
}
