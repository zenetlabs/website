import type { Locale } from '@/lib/i18n';

// Common words that belong to one of the two languages only.
const WORDS: Record<Locale, ReadonlySet<string>> = {
  en: new Set([
    'the',
    'and',
    'you',
    'your',
    'do',
    'does',
    'how',
    'what',
    'which',
    'when',
    'is',
    'are',
    'can',
    'i',
    'we',
    'with',
    'for',
    'of',
    'long',
    'much',
    'an',
    'it',
    'hi',
    'hello',
    'please',
    'speak',
    'english',
    'take',
    'would',
    'like',
    'want',
    'need',
    'have',
    'my',
    'our',
    'this',
    'that',
    'to',
    'will',
    'cost',
  ]),
  es: new Set([
    'el',
    'la',
    'los',
    'las',
    'de',
    'del',
    'que',
    'y',
    'en',
    'un',
    'una',
    'es',
    'por',
    'para',
    'con',
    'como',
    'qué',
    'cuánto',
    'cuanto',
    'hola',
    'puedo',
    'quiero',
    'tenéis',
    'hacéis',
    'mi',
    'lo',
    'al',
    'pero',
    'más',
    'hablas',
    'español',
    'cuesta',
    'nos',
    'tu',
    'vuestro',
    'sois',
    'está',
    'hay',
  ]),
};

const MIN_HITS = 2;

// The language to reply in: the site's, unless the message is clearly in the
// other one ("Hi, do you speak English?" on the Spanish site).
export function replyLanguage(message: string, locale: Locale): Locale {
  const words = message.toLowerCase().match(/\p{L}+/gu) ?? [];
  const hits = (language: Locale) =>
    words.filter((word) => WORDS[language].has(word)).length;
  const other: Locale = locale === 'en' ? 'es' : 'en';
  const theirs = hits(other);
  return theirs >= MIN_HITS && theirs > hits(locale) ? other : locale;
}
