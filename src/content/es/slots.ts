import type { DeskCopy } from '@/content/types';

// The booking copy of the desk: shared by the home page and the contact page.
export const slotsCopy = {
  title: 'Reserva una llamada de 30 minutos',
  meta: '30 minutos por Google Meet',
  group: 'Próximas horas libres',
  timesIn: 'Hora de {zone}',
  seeAll: 'Ver todas las horas',
  seeAvailable: 'Ver horas disponibles',
  unavailable:
    'La reserva en línea no está disponible ahora mismo. Envíanos un mensaje y te proponemos una hora.',
  message: 'Enviar un mensaje',
} satisfies DeskCopy['slots'];
