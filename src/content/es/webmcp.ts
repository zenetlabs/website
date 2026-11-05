import { bookingPending } from '@/content/es/booking-pending';
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
      'Abre un diálogo de confirmación en esta página. El visitante escribe allí su nombre, email y empresa, así que pasa solo el horario (devuelto por check_availability) y el tema. Cuando confirma el diálogo, la hora queda guardada 30 minutos y recibe un correo con un enlace: la llamada solo queda reservada cuando lo abre y pulsa Confirmar. Un resultado pending significa exactamente eso; no le digas nunca al visitante que la llamada está reservada.',
    navigate:
      'Abre una página de este sitio en la pestaña actual o baja hasta una sección de la página de inicio.',
  },
  dialog: {
    title: 'Confirma tu llamada',
    intro:
      'Un agente de IA de tu navegador ha pedido reservar esta llamada por ti. Revisa los datos: no se reserva nada hasta que confirmes aquí y después pulses Confirmar en el correo que te enviamos.',
    when: 'Cuándo',
    confirm: 'Pedir esta hora',
    confirming: 'Enviando…',
    cancel: 'Cancelar',
    close: 'Cerrar',
    pending: bookingPending,
    errors: {
      captcha:
        'La comprobación de seguridad ha fallado. Inténtalo de nuevo o escribe a',
      rate: 'Demasiados intentos desde tu conexión. Espera un minuto e inténtalo de nuevo, o escribe a',
      taken:
        'Esa hora ya no está disponible. Pide otra a tu agente o escribe a',
      limit:
        'Ahora no podemos guardarte otra hora con esta dirección. Si ya pediste una, confírmala desde el correo; si no, inténtalo más tarde o escríbenos a',
      disposable:
        'Usa una dirección de correo permanente. No podemos reservar llamadas con buzones temporales.',
      error:
        'No hemos podido enviar la solicitud. Revisa los datos e inténtalo de nuevo, o escribe a',
    },
  },
};
