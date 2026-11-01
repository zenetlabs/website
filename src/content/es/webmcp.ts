import type { WebMcpCopy } from '@/content/types';

// TODO(albert): review the WebMCP tool titles, the agent-facing notes and the confirmation dialog copy
export const webmcpCopy: WebMcpCopy = {
  titles: {
    get_faq: 'Buscar en las preguntas frecuentes',
    get_pricing: 'Consultar precios oficiales',
    estimate_project: 'Estimar un proyecto',
    check_availability: 'Ver disponibilidad para una llamada',
    book_meeting: 'Reservar una llamada de 30 minutos',
    navigate: 'Ir a una página',
  },
  notes: {
    book_meeting:
      'Abre un diálogo de confirmación en esta página. No se reserva nada hasta que el visitante lo confirme, y el resultado indica qué ha pasado. El visitante escribe su nombre, email y empresa en ese diálogo, así que pasa solo el horario (devuelto por check_availability) y el tema.',
    navigate:
      'Abre una página de este sitio en la pestaña actual o baja hasta una sección de la página de inicio.',
  },
  dialog: {
    title: 'Confirma tu llamada',
    intro:
      'Un agente de IA de tu navegador ha pedido reservar esta llamada por ti. Revisa los datos: no se reserva nada hasta que confirmes.',
    when: 'Cuándo',
    confirm: 'Confirmar reserva',
    confirming: 'Reservando…',
    cancel: 'Cancelar',
    close: 'Cerrar',
    success: {
      title: 'Llamada reservada',
      text: 'Hemos enviado una invitación de Google Calendar y una confirmación a {email}.',
      meet: 'Abrir el enlace de Google Meet',
      meetLater: 'El enlace de Google Meet está en la invitación.',
    },
    errors: {
      captcha:
        'La comprobación de seguridad ha fallado. Inténtalo de nuevo o escribe a',
      rate: 'Demasiados intentos desde tu conexión. Espera un minuto e inténtalo de nuevo, o escribe a',
      taken:
        'Esa hora ya no está disponible. Pide otra a tu agente o escribe a',
      error:
        'No hemos podido reservar la llamada. Revisa los datos e inténtalo de nuevo, o escribe a',
    },
  },
};
