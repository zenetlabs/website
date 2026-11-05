import { DEFAULT_ZONE } from '@/content/booking-rules';
import { legalEntity } from '@/lib/content';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';
import { formatSlotLabel, formatSlotTime } from '@/lib/slot-format';
import { FROM } from '@/server/lead-emails';
import type { OutgoingEmail } from '@/server/resend';

// Fixed copy only: no name, company or topic, so the form cannot be used to put
// someone else's text into an email from our domain.
export type VisitorBooking = {
  locale: Locale;
  email: string;
  start: number;
  timeZone: string | null;
  origin: string;
  // When the held request lapses; the verify email names the time.
  expiresAt: number;
};

type Parts = {
  label: string;
  zone: string;
  until: string;
  link: string;
  signature: string[];
};

const VERIFY: Record<
  Locale,
  { subject: (label: string) => string; body: (parts: Parts) => string[] }
> = {
  en: {
    subject: (label) => `Confirm your call with Zenet Labs: ${label}`,
    body: ({ label, zone, until, link, signature }) => [
      'Hello,',
      '',
      `To book your 30-minute call with Zenet Labs (${label}, ${zone}), confirm it here before ${until}:`,
      link,
      '',
      "Until then we keep the time for you. If you don't confirm, it is released and nothing else happens.",
      '',
      ...signature,
      '',
      "You are receiving this email because this address was entered to book a call on zenetlabs.com. If that wasn't you, ignore it: no call is booked and we won't write again.",
    ],
  },
  es: {
    subject: (label) => `Confirma tu llamada con Zenet Labs: ${label}`,
    body: ({ label, zone, until, link, signature }) => [
      'Hola:',
      '',
      `Para reservar tu llamada de 30 minutos con Zenet Labs (${label}, ${zone}), confírmala aquí antes de las ${until}:`,
      link,
      '',
      'Hasta entonces te guardamos la hora. Si no la confirmas, la liberamos y no pasa nada más.',
      '',
      ...signature,
      '',
      'Recibes este correo porque alguien ha escrito esta dirección para reservar una llamada en zenetlabs.com. Si no has sido tú, ignóralo: no se reserva ninguna llamada y no volveremos a escribirte.',
    ],
  },
};

const CANCELLED: Record<
  Locale,
  { subject: (label: string) => string; body: (parts: Parts) => string[] }
> = {
  en: {
    subject: (label) => `Cancelled: your call with Zenet Labs, ${label}`,
    body: ({ label, zone, link, signature }) => [
      'Hello,',
      '',
      `We've had to cancel your 30-minute call (${label}, ${zone}). Sorry for the change.`,
      '',
      `To pick another time: ${link}`,
      "Or reply to this email and we'll find one together.",
      '',
      ...signature,
    ],
  },
  es: {
    subject: (label) => `Cancelada: tu llamada con Zenet Labs, ${label}`,
    body: ({ label, zone, link, signature }) => [
      'Hola:',
      '',
      `Hemos tenido que cancelar tu llamada de 30 minutos (${label}, ${zone}). Sentimos el cambio.`,
      '',
      `Para elegir otra hora: ${link}`,
      'O responde a este correo y buscamos una juntos.',
      '',
      ...signature,
    ],
  },
};

export function bookUrl(origin: string, locale: Locale): string {
  return `${origin}${pagePath(locale, 'book')}`;
}

export function confirmUrl(
  origin: string,
  locale: Locale,
  token: string,
): string {
  return `${bookUrl(origin, locale)}?confirm=${token}`;
}

function render(
  copy: (typeof VERIFY)[Locale],
  booking: VisitorBooking,
  link: string,
): OutgoingEmail {
  const zone = booking.timeZone ?? DEFAULT_ZONE[booking.locale];
  const label = formatSlotLabel(booking.locale, booking.start, zone);
  const home = booking.locale === 'en' ? '' : `/${booking.locale}`;
  return {
    from: FROM,
    to: booking.email,
    replyTo: PUBLIC_EMAIL,
    subject: copy.subject(label),
    text: copy
      .body({
        label,
        zone,
        until: formatSlotTime(booking.locale, booking.expiresAt, zone),
        link,
        signature: [
          `Zenet Labs · ${legalEntity(booking.locale).legalName}`,
          `${booking.origin}${home}`,
        ],
      })
      .join('\n'),
  };
}

export function verifyEmail(
  booking: VisitorBooking,
  token: string,
): OutgoingEmail {
  return render(
    VERIFY[booking.locale],
    booking,
    confirmUrl(booking.origin, booking.locale, token),
  );
}

export function cancelledEmail(booking: VisitorBooking): OutgoingEmail {
  return render(
    CANCELLED[booking.locale],
    booking,
    bookUrl(booking.origin, booking.locale),
  );
}
