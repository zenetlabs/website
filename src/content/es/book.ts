import { bookingPending } from '@/content/es/booking-pending';
import { zoneNames } from '@/content/es/zone-names';
import type { BookPageContent } from '@/content/types';

// TODO(albert): revisar el texto, incluido "gratis, sin compromiso" y que la llamada sea el paso previo al diagnóstico de pago
export const bookPage = {
  meta: {
    title: 'Reservar una llamada',
    metaTitle: 'Reserva una llamada de 30 minutos | Zenet Labs',
    description:
      'Elige hora para una videollamada gratuita de 30 minutos con Zenet Labs sobre el trabajo manual de tu empresa. Te enviamos un enlace para confirmarla.',
  },
  breadcrumb: { label: 'Ruta de navegación' },
  title: {
    before: 'Treinta minutos para elegir el ',
    emphasis: 'primer',
    after: ' trabajo',
  },
  lead: 'Cuéntanos dónde tu equipo copia datos a mano. Te diremos con franqueza si merece la pena automatizarlo y cuál sería el primer paso.',
  facts: [
    { id: 'duration', label: 'Duración', value: '30 minutos' },
    {
      id: 'where',
      label: 'Dónde',
      value: 'Google Meet. El enlace llega en la invitación del calendario.',
    },
    { id: 'cost', label: 'Coste', value: 'Gratis, sin compromiso.' },
    {
      id: 'next',
      label: 'Siguiente paso',
      value:
        'Si encaja, te proponemos el diagnóstico de automatización ({diagnostic}, que se descuenta del proyecto si sigues adelante en 60 días).',
    },
  ],
  zone: {
    label: 'Tu zona horaria',
    show: 'Ver horarios',
    legend: 'Horas en {zone}',
    zones: zoneNames,
  },
  picker: {
    legend: 'Elige una hora',
    days: 'Elige un día',
    times: { one: '1 hora', other: '{n} horas' },
    required: 'Elige primero una hora.',
    chosen: 'Tu llamada',
    none: 'Aún no has elegido hora. Elige un día y después una hora.',
    weekdays: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
    closed: {
      past: 'ya ha pasado',
      soon: 'demasiado pronto para reservar',
      off: 'las llamadas son {days} (hora de Madrid)',
      full: 'completo',
      beyond: 'aún no se puede reservar',
      holiday: 'festivo: {name}',
    },
    dayList: { range: 'de {from} a {to}', and: 'y' },
    regions: { ES: 'España', CT: 'Cataluña', SG: 'Singapur' },
    holidays: 'Sin llamadas en festivos (hora de Madrid)',
  },
  form: {
    label: 'Formulario de reserva',
    details: 'Tus datos',
    name: 'Nombre',
    email: 'Correo electrónico (aquí llega el enlace para confirmar)',
    company: 'Empresa (opcional)',
    topic: '¿De qué te gustaría hablar?',
    consent:
      'He leído la {privacyLink}: {legalName} usará estos datos para reservar esta llamada, incluido un evento de Google Calendar con mi correo electrónico, y en ella se explica cómo ejercer mis derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad.',
    consentLink: 'política de privacidad',
    honeypot: 'Deja este campo vacío',
    submit: 'Pedir esta hora',
    sending: 'Enviando…',
    noscript:
      'Reservar requiere JavaScript. Escríbenos la hora que te venga bien a {email}.',
  },
  pending: bookingPending,
  errors: {
    taken:
      'Alguien acaba de reservar esa hora. La lista ya está actualizada, elige otra por favor.',
    dayFull:
      'Ese día ya está completo. La lista está actualizada, elige otro día.',
    limit:
      'Ahora no podemos guardarte otra hora con esta dirección. Si ya pediste una, confírmala desde el correo; si no, inténtalo más tarde o escríbenos a',
    disposable:
      'Usa una dirección de correo permanente. No podemos reservar llamadas con buzones temporales.',
    send: 'No hemos podido enviar la solicitud. Inténtalo de nuevo o escribe a',
    captcha:
      'La comprobación de seguridad ha fallado. Inténtalo de nuevo o escribe a',
    rate: 'Demasiados intentos desde tu conexión. Espera un minuto e inténtalo de nuevo, o escribe a',
  },
  unavailable: {
    title: 'La reserva en línea no está disponible ahora mismo',
    text: 'Mándanos un mensaje y te proponemos una hora.',
  },
  empty: {
    title: 'No hay horas libres en las próximas dos semanas',
    text: 'Mándanos un mensaje y buscamos una hora que te venga bien.',
  },
  contactMail: 'O escríbenos a',
  llms: 'Reserva una llamada gratuita de 30 minutos',
} satisfies BookPageContent;
