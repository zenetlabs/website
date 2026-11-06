// The assistant's opening, shared by the home desk (rendered on the server) and
// the chat panel, so both say exactly the same thing.
export const assistantIntro = {
  title: 'Asistente de Zenet Labs',
  badge: 'IA',
  welcome:
    '¡Hola! Pregúntame por nuestros servicios, precios o cómo trabajamos.',
  welcomeBooking:
    ' También puedo buscarte hueco para una llamada de 30 minutos.',
  suggestions: [
    '¿Cuánto cuesta un agente de IA?',
    '¿Qué incluye el diagnóstico de automatización?',
  ],
  inputLabel: 'Tu mensaje',
  placeholder: 'Escribe tu pregunta',
  send: 'Enviar',
} as const;
