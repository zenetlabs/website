import { cases } from '@/content/es/cases';
import { companies } from '@/content/es/companies';
import type { CasesHubContent } from '@/content/types';

export const casesHub = {
  meta: {
    title: 'Casos',
    metaTitle: 'Casos de éxito: agentes de IA en Viatsy y Taplany',
    description:
      'Antes de automatizar para un cliente, lo probamos en un negocio propio. Mira qué funciona solo en Viatsy y Taplany, dos de nuestras empresas.',
  },
  title: {
    before: 'Automatización probada primero en ',
    emphasis: 'nuestras propias empresas',
    after: '',
  },
  lead: 'Antes de construir una automatización para un cliente, la hacemos funcionar en un negocio nuestro. Estas son dos de las empresas que gestionamos con agentes, qué funciona solo en cada una y dónde leer la historia completa.',
  cases: {
    title: {
      before: 'Dos de nuestras empresas, ',
      emphasis: 'gestionadas con agentes',
      after: '',
    },
    lead: 'En todos los casos, los agentes preparan el trabajo y una persona aprueba cada respuesta y propuesta antes de enviarla.',
    automatedLabel: 'Lo que gestiona el sistema',
    actors: { tool: 'Tus herramientas', agent: 'Agente', human: 'Una persona' },
    items: cases,
  },
  companies: { title: 'Todas las empresas que dirigimos', items: companies },
  cta: {
    title: 'Empieza por el diagnóstico',
    text: 'Cuéntanos qué hace tu equipo a mano y te responderemos personalmente.',
    button: 'Reservar una llamada',
  },
} satisfies CasesHubContent;
