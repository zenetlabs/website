import { assistantIntro } from '@/content/es/assistant-intro';
import { bookingPending } from '@/content/es/booking-pending';
import { slotsCopy } from '@/content/es/slots';
import { zoneNames } from '@/content/es/zone-names';
import type { ChatCopy } from '@/content/types';

// TODO(albert): review the widget copy
export const chatCopy = {
  title: assistantIntro.title,
  talk: 'Mejor por voz',
  badge: assistantIntro.badge,
  notice:
    'Estás hablando con un asistente de IA, no con una persona: sus respuestas las genera automáticamente un modelo de IA. Responde con el contenido de esta web y puede equivocarse; los precios salen solo de nuestra lista oficial. Guardamos esta conversación 30 días para responderte y evitar abusos, o 24 meses junto a tu consulta si reservas una llamada o envías el formulario de contacto. No compartas contraseñas ni datos personales sensibles.',
  noticeShort: 'Responde una IA, no una persona. Guardamos el chat 30 días.',
  noticeToggle: 'Detalles',
  privacyShort: 'Privacidad',
  privacyLink: 'Política de privacidad',
  welcome: assistantIntro.welcome,
  welcomeBooking: assistantIntro.welcomeBooking,
  suggestions: assistantIntro.suggestions,
  suggestionBooking: 'Reservar una llamada de 30 minutos',
  logLabel: 'Conversación',
  you: 'Tú',
  assistant: 'Asistente (IA)',
  inputLabel: assistantIntro.inputLabel,
  placeholder: assistantIntro.placeholder,
  send: assistantIntro.send,
  close: 'Cerrar el asistente',
  verifying: 'Comprobando que no eres un bot…',
  writing: 'El asistente está escribiendo…',
  tools: {
    get_faq: 'Consultando las preguntas frecuentes…',
    get_pricing: 'Consultando nuestros precios…',
    estimate_project: 'Preparando una estimación…',
    check_availability: 'Buscando horas libres…',
    book_meeting: 'Preparando tu reserva…',
    navigate: 'Buscando la página…',
  },
  open: 'Abrir: {label}',
  remaining: 'Te quedan {n} mensajes en esta conversación',
  newSession:
    'Esta conversación había caducado, así que he empezado una nueva.',
  errorRate:
    'Estás enviando mensajes demasiado rápido. Espera un minuto y vuelve a intentarlo.',
  errorCaptcha:
    'No hemos podido verificar tu navegador. Vuelve a intentarlo o escribe a hello@zenetlabs.com.',
  errorReply:
    'La respuesta se ha cortado. Puedes volver a preguntar o contactarnos directamente:',
  fallback: {
    title: 'El asistente no puede responder ahora',
    full: 'Esta conversación ha llegado al límite de mensajes.',
    text: 'Puedes contactarnos directamente:',
    book: 'Reservar una llamada de 30 minutos',
    form: 'Usar el formulario de contacto',
  },
  pages: {
    home: 'Inicio',
    services: 'Servicios',
    diagnostic: 'Diagnóstico de automatización',
    automation: 'Automatización de procesos',
    integrations: 'Integraciones',
    agents: 'Agentes de IA',
    software: 'Software a medida',
    training: 'Formación en IA',
    maintenance: 'Mantenimiento',
    holdedPrestashop: 'Holded y PrestaShop',
    holdedWoocommerce: 'Holded y WooCommerce',
    holdedHubspot: 'Holded y HubSpot',
    verifactu: 'Verifactu',
    travelAgencies: 'Agencias de viajes',
    viatsyCase: 'Caso de Viatsy',
    cases: 'Casos',
    contact: 'Contacto',
    pricing: 'Precios',
    calculator: 'Calculadora de precios',
    about: 'Sobre nosotros',
    book: 'Reservar una llamada',
    privacy: 'Política de privacidad',
    cookies: 'Política de cookies',
    legalNotice: 'Aviso legal',
  },
  sections: {
    services: 'Servicios',
    faq: 'Preguntas frecuentes',
  },
  slots: slotsCopy,
  zones: zoneNames,
  person: {
    text: '¿Prefieres una persona? Habla con Albert Sabaté.',
    book: 'Reservar una llamada',
    write: 'Escríbenos',
  },
  offline:
    'No tienes conexión. Tu mensaje se queda aquí; envíalo cuando vuelvas.',
  booking: {
    title: 'Confirma tu llamada',
    when: 'Cuándo',
    format: '30 minutos por Google Meet',
    name: 'Nombre',
    email: 'Correo de trabajo',
    company: 'Empresa (opcional)',
    topic: '¿De qué quieres hablar?',
    confirm: 'Pedir esta hora',
    sending: 'Enviando…',
    cancel: 'Ahora no',
    close: 'Cerrar',
    done: 'Te guardamos {when}. Revisa tu correo y pulsa Confirmar en los próximos 30 minutos para reservarla.',
    pending: bookingPending,
    taken: 'Esa hora se acaba de ocupar. Pídeme otra.',
    limit:
      'Ahora no podemos guardarte otra hora con esta dirección. Si ya pediste una, confírmala desde el correo; si no, inténtalo más tarde o escríbenos a hello@zenetlabs.com.',
    disposable:
      'Usa una dirección de correo permanente. No podemos reservar llamadas con buzones temporales.',
    error:
      'No hemos podido reservarla. Vuelve a intentarlo, usa la página de reservas o escribe a hello@zenetlabs.com.',
    rate: 'Demasiados intentos desde tu conexión. Espera un minuto y vuelve a intentarlo.',
    captcha: 'La comprobación de seguridad ha fallado. Vuelve a intentarlo.',
  },
} satisfies ChatCopy;
