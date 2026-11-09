// Weekday names in English and Spanish, lower case without accents, ISO
// numbered (Monday is 1). Pure data, shared by the chat guard and intent
// reads (server) and the panel's time stripper (lazy client chunk).
export const WEEKDAY_NAMES: Readonly<Record<string, number>> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
};
