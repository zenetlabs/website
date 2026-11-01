import type { BookPageContent } from '@/content/types';

// TODO(albert): revisar el texto, incluido "gratis, sin compromiso" y que la llamada sea el paso previo al diagnóstico de pago
export const bookPage = {
  meta: {
    title: 'Reservar una llamada',
    metaTitle: 'Reserva una llamada de 30 minutos | Zenet Labs',
    description:
      'Elige hora para una videollamada gratuita de 30 minutos con Zenet Labs sobre el trabajo manual de tu empresa. Sin crear cuenta.',
  },
  breadcrumb: { label: 'Ruta de navegación' },
  eyebrow: 'Reservar una llamada',
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
    zones: {
      'Pacific/Honolulu': 'Honolulú',
      'America/Los_Angeles': 'Los Ángeles',
      'America/Denver': 'Denver',
      'America/Mexico_City': 'Ciudad de México',
      'America/Chicago': 'Chicago',
      'America/New_York': 'Nueva York',
      'America/Bogota': 'Bogotá',
      'America/Sao_Paulo': 'São Paulo',
      'America/Argentina/Buenos_Aires': 'Buenos Aires',
      UTC: 'UTC',
      'Europe/London': 'Londres',
      'Europe/Madrid': 'Madrid',
      'Europe/Berlin': 'Berlín',
      'Europe/Athens': 'Atenas',
      'Europe/Moscow': 'Moscú',
      'Africa/Lagos': 'Lagos',
      'Africa/Johannesburg': 'Johannesburgo',
      'Asia/Dubai': 'Dubái',
      'Asia/Kolkata': 'Bombay y Delhi',
      'Asia/Bangkok': 'Bangkok',
      'Asia/Singapore': 'Singapur',
      'Asia/Hong_Kong': 'Hong Kong',
      'Asia/Tokyo': 'Tokio',
      'Australia/Perth': 'Perth',
      'Australia/Sydney': 'Sídney',
      'Pacific/Auckland': 'Auckland',
    },
  },
  picker: {
    legend: 'Elige una hora',
    times: { one: '1 hora', other: '{n} horas' },
    required: 'Elige primero una hora.',
  },
  form: {
    label: 'Formulario de reserva',
    details: 'Tus datos',
    name: 'Nombre',
    email: 'Correo electrónico (aquí llega la invitación)',
    company: 'Empresa (opcional)',
    topic: '¿De qué te gustaría hablar?',
    consent:
      'Acepto que {legalName} use estos datos para reservar esta llamada, incluido un evento de Google Calendar con mi correo electrónico, tal como se describe en la {privacyLink}.',
    consentLink: 'política de privacidad',
    honeypot: 'Deja este campo vacío',
    submit: 'Reservar esta hora',
    sending: 'Reservando…',
    noscript:
      'Reservar requiere JavaScript. Escríbenos la hora que te venga bien a {email}.',
  },
  success: {
    title: 'Reserva confirmada',
    when: 'Tu llamada es el {time} ({zone}).',
    text: 'Hemos enviado una invitación de Google Calendar y una confirmación a {email}.',
    meet: 'Entrar con Google Meet',
    meetLater:
      'El enlace de Google Meet llega con la invitación del calendario. Si no lo ves, te lo enviaremos antes de la llamada.',
  },
  errors: {
    taken:
      'Alguien acaba de reservar esa hora. La lista ya está actualizada, elige otra por favor.',
    dayFull:
      'Ese día ya está completo. La lista está actualizada, elige otro día.',
    limit:
      'No hemos podido reservar esa hora para esa dirección. Elige otra hora o escribe a',
    send: 'No hemos podido confirmar la reserva. Inténtalo de nuevo o escribe a',
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
