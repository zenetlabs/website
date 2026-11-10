import {
  BOOKING_HOLIDAYS,
  type BookingHoliday,
} from '@/content/booking-holidays';

export type BookingRules = {
  zone: string;
  days: readonly number[];
  windows: readonly { from: string; to: string }[];
  holidays: readonly BookingHoliday[];
  slotMinutes: number;
  stepMinutes: number;
  bufferMinutes: number;
  maxPerDay: number;
  minNoticeHours: number;
  horizonDays: number;
  holdSeconds: number;
  confirmMinutes: number;
};

// Europe/Madrid wall clock, ISO weekdays. The last call ends at 16:00 Madrid,
// 23:00 in Shanghai in winter and 22:00 in summer.
// TODO(albert): confirm the 14-day booking horizon.
export const BOOKING_RULES = {
  zone: 'Europe/Madrid',
  days: [1, 2, 3, 4],
  windows: [{ from: '10:00', to: '16:00' }],
  holidays: BOOKING_HOLIDAYS,
  slotMinutes: 30,
  stepMinutes: 30,
  bufferMinutes: 15,
  maxPerDay: 3,
  minNoticeHours: 12,
  horizonDays: 14,
  // The insert window after the visitor pressed Confirm.
  holdSeconds: 120,
  // How long a requested slot waits for the click on the emailed link.
  confirmMinutes: 30,
} as const satisfies BookingRules;

export const BOOKING_TIME_ZONES = [
  'Pacific/Honolulu',
  'America/Los_Angeles',
  'America/Denver',
  'America/Mexico_City',
  'America/Chicago',
  'America/New_York',
  'America/Bogota',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'UTC',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Berlin',
  'Europe/Athens',
  'Europe/Moscow',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Perth',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export type BookingZone = (typeof BOOKING_TIME_ZONES)[number];

export const DEFAULT_ZONE = {
  en: 'Asia/Singapore',
  es: 'Europe/Madrid',
} as const satisfies Record<'en' | 'es', BookingZone>;
