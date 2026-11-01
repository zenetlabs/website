export type BookingRules = {
  zone: string;
  days: readonly number[];
  windows: readonly { from: string; to: string }[];
  slotMinutes: number;
  stepMinutes: number;
  bufferMinutes: number;
  maxPerDay: number;
  minNoticeHours: number;
  horizonDays: number;
  holdSeconds: number;
};

// TODO(albert): confirm the call windows (Europe/Madrid wall clock, ISO weekdays 1-7).
// The 08:00-09:00 window is the morning slot that lands in the Singapore afternoon.
// TODO(albert): confirm the 14-day booking horizon.
export const BOOKING_RULES = {
  zone: 'Europe/Madrid',
  days: [1, 2, 3, 4, 5],
  windows: [
    { from: '08:00', to: '09:00' },
    { from: '09:00', to: '18:00' },
  ],
  slotMinutes: 30,
  stepMinutes: 30,
  bufferMinutes: 15,
  maxPerDay: 3,
  minNoticeHours: 12,
  horizonDays: 14,
  holdSeconds: 120,
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
