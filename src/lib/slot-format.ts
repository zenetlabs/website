import type { Locale } from '@/lib/i18n';
import { dateKey, type ZonedParts, zonedParts } from '@/lib/slots';

const WEEKDAYS: Record<Locale, readonly string[]> = {
  en: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ],
  es: [
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
    'domingo',
  ],
};

const MONTHS: Record<Locale, readonly string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
};

function two(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDayParts(
  locale: Locale,
  { weekday, day, month }: ZonedParts,
): string {
  const name = WEEKDAYS[locale][weekday - 1];
  const monthName = MONTHS[locale][month - 1];
  return locale === 'en'
    ? `${name} ${day} ${monthName}`
    : `${name} ${day} de ${monthName}`;
}

export function formatTimeParts(
  locale: Locale,
  { hour, minute }: ZonedParts,
): string {
  if (locale === 'es') return `${two(hour)}:${two(minute)}`;
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return `${clock}:${two(minute)} ${hour < 12 ? 'am' : 'pm'}`;
}

export function formatSlotDay(
  locale: Locale,
  instant: number,
  zone: string,
): string {
  return formatDayParts(locale, zonedParts(instant, zone));
}

export function formatSlotTime(
  locale: Locale,
  instant: number,
  zone: string,
): string {
  return formatTimeParts(locale, zonedParts(instant, zone));
}

export function formatSlotLabel(
  locale: Locale,
  instant: number,
  zone: string,
): string {
  const parts = zonedParts(instant, zone);
  return `${formatDayParts(locale, parts)}, ${formatTimeParts(locale, parts)}`;
}

// The calendar day of an instant in a zone, as `YYYY-MM-DD`.
export function zonedDay(instant: number, zone: string): string {
  return dateKey(zonedParts(instant, zone));
}
