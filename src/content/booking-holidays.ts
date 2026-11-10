// Days with no calls: Spanish national holidays (ES, the ones the BOE lists as
// national, Epiphany included), the rest of Catalonia's list (CT) and Singapore's public
// holidays (SG), with the Monday a Sunday holiday moves to. Each one is a
// full day in its own zone. Refresh yearly (docs/RUNBOOK.md section 14).
export const HOLIDAY_REGIONS = ['ES', 'CT', 'SG'] as const;
export type HolidayRegion = (typeof HOLIDAY_REGIONS)[number];

export type BookingHoliday = {
  date: `${number}-${number}-${number}`;
  region: HolidayRegion;
  name: { en: string; es: string };
};

export const HOLIDAY_ZONES = {
  ES: 'Europe/Madrid',
  CT: 'Europe/Madrid',
  SG: 'Asia/Singapore',
} as const satisfies Record<HolidayRegion, string>;

export const HOLIDAYS_CHECKED_ON = '2026-11-10';

export const HOLIDAY_SOURCES = {
  ES: [
    'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-21667',
    'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-21254',
  ],
  CT: [
    'https://dogc.gencat.cat/ca/document-del-dogc/?documentId=1013204',
    'https://dogc.gencat.cat/ca/document-del-dogc/?documentId=1040896',
  ],
  SG: [
    'https://www.mom.gov.sg/employment-practices/public-holidays',
    'https://www.mom.gov.sg/newsroom/press-releases/2026/0618-public-holidays-for-2027',
  ],
} as const satisfies Record<HolidayRegion, readonly string[]>;

function es(
  date: BookingHoliday['date'],
  en: string,
  name: string,
): BookingHoliday {
  return { date, region: 'ES', name: { en, es: name } };
}

function ct(
  date: BookingHoliday['date'],
  en: string,
  name: string,
): BookingHoliday {
  return { date, region: 'CT', name: { en, es: name } };
}

function sg(
  date: BookingHoliday['date'],
  en: string,
  name: string,
): BookingHoliday {
  return { date, region: 'SG', name: { en, es: name } };
}

export const BOOKING_HOLIDAYS: readonly BookingHoliday[] = [
  // Spain 2026: BOE-A-2025-21667 (Resolución de 17 de octubre de 2025).
  es('2026-01-01', "New Year's Day", 'Año Nuevo'),
  es('2026-01-06', 'Epiphany', 'Reyes'),
  es('2026-04-03', 'Good Friday', 'Viernes Santo'),
  es('2026-05-01', 'Labour Day', 'Fiesta del Trabajo'),
  es('2026-08-15', 'Assumption Day', 'Asunción de la Virgen'),
  es('2026-10-12', 'Spanish National Day', 'Fiesta Nacional de España'),
  es('2026-12-08', 'Immaculate Conception', 'Inmaculada Concepción'),
  es('2026-12-25', 'Christmas Day', 'Navidad'),
  // Catalonia 2026: Ordre EMT/66/2025 (DOGC 9406, 6 May 2025).
  ct('2026-04-06', 'Easter Monday', 'Lunes de Pascua'),
  ct('2026-06-24', "St John's Day", 'San Juan'),
  ct('2026-09-11', 'National Day of Catalonia', 'Diada de Cataluña'),
  ct('2026-12-26', "St Stephen's Day", 'San Esteban'),
  // Singapore 2026: MOM, with the Monday after a Sunday holiday.
  sg('2026-01-01', "New Year's Day", 'Año Nuevo'),
  sg('2026-02-17', 'Chinese New Year', 'Año Nuevo chino'),
  sg('2026-02-18', 'Chinese New Year', 'Año Nuevo chino'),
  sg('2026-03-21', 'Hari Raya Puasa', 'Hari Raya Puasa'),
  sg('2026-04-03', 'Good Friday', 'Viernes Santo'),
  sg('2026-05-01', 'Labour Day', 'Día del Trabajo'),
  sg('2026-05-27', 'Hari Raya Haji', 'Hari Raya Haji'),
  sg('2026-05-31', 'Vesak Day', 'Vesak'),
  sg('2026-06-01', 'Vesak Day (observed)', 'Vesak (trasladado)'),
  sg('2026-08-09', 'National Day', 'Día Nacional'),
  sg('2026-08-10', 'National Day (observed)', 'Día Nacional (trasladado)'),
  sg('2026-11-08', 'Deepavali', 'Deepavali'),
  sg('2026-11-09', 'Deepavali (observed)', 'Deepavali (trasladado)'),
  sg('2026-12-25', 'Christmas Day', 'Navidad'),
  // Spain 2027: BOE-A-2026-21254 (Resolución de 8 de octubre de 2026).
  es('2027-01-01', "New Year's Day", 'Año Nuevo'),
  es('2027-01-06', 'Epiphany', 'Reyes'),
  es('2027-03-26', 'Good Friday', 'Viernes Santo'),
  es('2027-05-01', 'Labour Day', 'Fiesta del Trabajo'),
  es('2027-10-12', 'Spanish National Day', 'Fiesta Nacional de España'),
  es('2027-11-01', "All Saints' Day", 'Todos los Santos'),
  es('2027-12-06', 'Constitution Day', 'Día de la Constitución'),
  es('2027-12-08', 'Immaculate Conception', 'Inmaculada Concepción'),
  es('2027-12-25', 'Christmas Day', 'Navidad'),
  // Catalonia 2027: Ordre EMT/52/2026 (DOGC 9637, 1 April 2026).
  ct('2027-03-29', 'Easter Monday', 'Lunes de Pascua'),
  ct('2027-06-24', "St John's Day", 'San Juan'),
  ct('2027-09-11', 'National Day of Catalonia', 'Diada de Cataluña'),
  // Singapore 2027: MOM press release of 18 June 2026.
  sg('2027-01-01', "New Year's Day", 'Año Nuevo'),
  sg('2027-02-06', 'Chinese New Year', 'Año Nuevo chino'),
  sg('2027-02-07', 'Chinese New Year', 'Año Nuevo chino'),
  sg(
    '2027-02-08',
    'Chinese New Year (observed)',
    'Año Nuevo chino (trasladado)',
  ),
  sg('2027-03-10', 'Hari Raya Puasa', 'Hari Raya Puasa'),
  sg('2027-03-26', 'Good Friday', 'Viernes Santo'),
  sg('2027-05-01', 'Labour Day', 'Día del Trabajo'),
  sg('2027-05-17', 'Hari Raya Haji', 'Hari Raya Haji'),
  sg('2027-05-20', 'Vesak Day', 'Vesak'),
  sg('2027-08-09', 'National Day', 'Día Nacional'),
  sg('2027-10-28', 'Deepavali', 'Deepavali'),
  sg('2027-12-25', 'Christmas Day', 'Navidad'),
];

// The last day every place's list covers: 31 December of the earliest of
// their last years. Past it a day may hide an unlisted holiday.
export function holidaysCoverUntil(
  holidays: readonly BookingHoliday[],
): string {
  const years = HOLIDAY_REGIONS.map((region) =>
    holidays
      .reduce(
        (last, holiday) =>
          holiday.region === region && holiday.date > last
            ? holiday.date
            : last,
        '0000',
      )
      .slice(0, 4),
  );
  return `${years.sort()[0]}-12-31`;
}
