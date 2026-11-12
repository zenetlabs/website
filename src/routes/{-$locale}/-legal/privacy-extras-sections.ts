import type { LegalSectionRef } from '@/components/legal-page';

export const ASSISTANT_SECTION = {
  en: { id: 'assistant', title: 'The site assistant' },
  es: { id: 'asistente', title: 'El asistente de la web' },
} as const satisfies Record<string, LegalSectionRef>;

export const VOICE_SECTION = {
  en: { id: 'voice', title: 'Voice calls' },
  es: { id: 'llamadas-de-voz', title: 'Llamadas de voz' },
} as const satisfies Record<string, LegalSectionRef>;
