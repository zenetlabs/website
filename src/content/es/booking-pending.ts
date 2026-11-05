import type { BookingPendingCopy } from '@/content/types';

export const bookingPending = {
  title: 'Revisa tu correo',
  text: 'Te guardamos {label} durante 30 minutos y te hemos enviado un enlace a {email}. Ábrelo y pulsa Confirmar para reservar la llamada.',
  spam: '¿Aún no ha llegado? Puede tardar un minuto; mira también en spam.',
  resend: 'Enviar el correo otra vez',
  resending: 'Enviando…',
  resent: 'Enviado otra vez. Solo funciona el enlace más reciente.',
  cooldown: 'Te lo enviamos hace menos de un minuto. Mira en spam.',
  wrongAddress:
    '¿Dirección equivocada? Elige otra hora con la correcta; esta se libera sola en 30 minutos.',
} satisfies BookingPendingCopy;
