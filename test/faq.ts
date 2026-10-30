import { faq as enFaq } from '@/content/en/faq';
import { faq as esFaq } from '@/content/es/faq';
import type { FaqItem } from '@/content/types';
import type { Locale } from '@/lib/i18n';

export const FAQ: Record<Locale, readonly FaqItem[]> = { en: enFaq, es: esFaq };
