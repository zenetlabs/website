import { chatCopy } from '@/content/es/chat';
import type { VoiceCopy } from '@/content/types';

// TODO(albert): revisar el texto de voz
export const voiceCopy = {
  title: 'Habla con el asistente',
  badge: 'IA',
  notice:
    'Vas a hablar con un asistente de voz con IA, no con una persona. Responde con el contenido de esta web y puede equivocarse, así que comprueba los precios en nuestra página de precios. Tu voz la procesa ElevenLabs, nuestro proveedor de voz en Estados Unidos, para entenderte y responder; no grabamos el audio. ElevenLabs guarda el texto de la conversación 30 días. Si reservas una llamada, guardamos tu nombre, email y tema con tu consulta durante 24 meses. Durante la llamada, el asistente puede abrirte páginas de esta web.',
  privacyLink: 'Política de privacidad',
  micNote: 'Tu navegador te pedirá usar el micrófono al empezar.',
  start: 'Empezar la llamada',
  cancel: 'Ahora no',
  connecting: 'Conectando…',
  listening: 'Te escucho',
  speaking: 'El asistente está hablando',
  mute: 'Silenciar micrófono',
  unmute: 'Activar micrófono',
  end: 'Colgar',
  transcript: 'Lo que se ha dicho',
  you: 'Tú',
  assistant: 'Asistente (IA)',
  opened: 'Abierto: {label}',
  booked:
    'Reservada para el {label}. Te hemos enviado la invitación por email.',
  ended: 'Llamada terminada.',
  again: 'Empezar otra llamada',
  micDenied:
    'El micrófono está bloqueado. Permítelo en los ajustes del sitio de tu navegador y vuelve a intentarlo, o usa una de las opciones de abajo.',
  unsupported: 'Las llamadas de voz no funcionan en este navegador.',
  errorBudget: 'El asistente de voz ha llegado al límite de hoy.',
  errorRate: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
  errorCaptcha: 'No hemos podido verificar tu navegador. Inténtalo de nuevo.',
  errorCall: 'La llamada no ha podido empezar o se ha cortado.',
  fallbackText: 'Puedes contactarnos igualmente:',
  fallbackBook: 'Reservar una llamada de 30 minutos',
  fallbackForm: 'Usar el formulario de contacto',
  close: 'Cerrar',
  pages: chatCopy.pages,
  sections: chatCopy.sections,
} satisfies VoiceCopy;
