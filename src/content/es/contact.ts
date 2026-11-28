import { slotsCopy } from '@/content/es/slots';
import type { ContactPageContent } from '@/content/types';

export const contactPage = {
  meta: {
    title: 'Contacto',
    metaTitle: 'Contacta con Zenet Labs: reserva un diagnóstico',
    description:
      'Cuéntanos qué usas y qué hace tu equipo a mano. Te respondemos y acordamos el siguiente paso, empezando por un diagnóstico a precio cerrado.',
  },
  title: { before: 'Habla ', emphasis: 'con nosotros', after: '' },
  lead: 'Elige cómo prefieres contactarnos y te respondemos en un día laborable.',
  doors: {
    book: {
      title: 'Reservar una llamada',
      text: 'Elige la hora que te venga bien.',
    },
    message: {
      title: 'Enviar un mensaje',
      text: 'Te responde una persona de nuestro equipo.',
    },
    ai: {
      title: 'Hablar con la IA',
      text: 'Pregunta ahora. Es una IA, no una persona.',
    },
  },
  slots: slotsCopy,
  form: {
    title: { before: '', emphasis: 'Escríbenos', after: '' },
    lead: 'Dinos también qué herramientas usas.',
    mail: '¿Prefieres el correo? Escribe a',
    voice: {
      text: '¿Prefieres hablar? Nuestro asistente de voz es una IA, no una persona: responde tus dudas y te reserva una llamada.',
      button: 'Hablar con el asistente',
    },
  },
  next: {
    title: { before: 'Qué pasa ', emphasis: 'después', after: '' },
    steps: [
      {
        id: 'reply',
        label: 'Te respondemos',
        text: 'Te respondemos y acordamos el alcance en una llamada breve.',
      },
      {
        id: 'diagnostic',
        label: 'El diagnóstico',
        text: 'En una o dos semanas analizamos tus herramientas y el trabajo manual y te damos un plan con precio.',
      },
      {
        id: 'decide',
        label: 'Decides tú',
        text: 'Si sigues adelante en 60 días, el importe del diagnóstico se descuenta del proyecto.',
      },
    ],
  },
} satisfies ContactPageContent;
