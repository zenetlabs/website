import { assistantIntro } from '@/content/es/assistant-intro';
import { slotsCopy } from '@/content/es/slots';
import type { DeskCloseCopy } from '@/content/types';

// The desk and its doors, as home and the service and landing pages close with them.
export const deskClose = {
  desk: {
    label: 'Pregunta al asistente',
    intro: assistantIntro,
    human: {
      title: 'Pregúntanos',
      welcome:
        'Pregúntanos lo que quieras sobre tus herramientas y tus procesos. Te respondemos por correo, normalmente en un día laborable.',
      label: 'Tu pregunta para nosotros',
      placeholder: 'Escribe tu pregunta',
    },
    call: {
      button: 'Llamar',
      label: 'Llamar al agente de IA',
    },
    slots: slotsCopy,
  },
  doors: {
    call: {
      title: 'Llama al agente',
      text: 'Nuestro asistente de voz es una IA, no una persona.',
    },
    write: {
      title: 'Escríbenos',
      text: 'Usa el formulario de contacto.',
    },
  },
  human: 'Lo lee y lo contesta una persona de nuestro equipo.',
} satisfies DeskCloseCopy;
