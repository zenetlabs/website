import type { BookingConfirmCopy } from '@/content/types';

// The page behind the emailed link; loaded only when the URL carries ?confirm.
export const bookConfirm = {
  slot: '{label} ({zone}) · 30 minutos por Google Meet',
  for: 'Para {masked}',
  button: 'Confirmar la llamada',
  notYou:
    '¿No la has pedido tú? Cierra esta página. La hora se libera en 30 minutos y no pasa nada más.',
  pick: 'Ver horas libres',
  states: {
    pending: { title: 'Confirma tu llamada', text: '' },
    confirming: {
      title: 'Estamos creando tu invitación',
      text: 'Tarda unos segundos. Recarga la página si no se actualiza.',
    },
    confirmed: {
      title: 'Tu llamada está reservada',
      text: '{label} ({zone}). La invitación de Google Calendar con el enlace de Meet va de camino a {masked}.',
    },
    expired: {
      title: 'Este enlace ha caducado',
      text: 'Te guardamos la hora 30 minutos y después la liberamos. Elige otra hora.',
    },
    taken: {
      title: 'Esa hora ya no está libre',
      text: 'Nos ha surgido algo en el calendario antes de que confirmaras. Elige otra hora.',
    },
    failed: {
      title: 'No hemos podido crear la invitación',
      text: 'No se ha reservado nada. Vuelve a elegir una hora o escríbenos a hello@zenetlabs.com.',
    },
    unknown: {
      title: 'Estamos comprobando tu reserva',
      text: 'Nuestro calendario no ha respondido a tiempo. Te escribiremos en un día laborable como mucho; no tienes que hacer nada.',
    },
    unavailable: {
      title: 'Nuestro calendario no responde',
      text: 'No ha cambiado nada. Vuelve a pulsar el botón en unos minutos; el enlace funciona hasta las {time}.',
    },
    cancelled: {
      title: 'Esta llamada se ha cancelado',
      text: 'Elige otra hora o responde a nuestro correo.',
    },
    invalid: {
      title: 'Este enlace no funciona',
      text: 'Puede que esté incompleto o que lo haya sustituido un correo más reciente. Usa el enlace del último correo o vuelve a elegir una hora.',
    },
  },
} satisfies BookingConfirmCopy;
