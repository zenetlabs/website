import type { ModelMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { guardSentence } from '@/server/chat/guard';
import {
  type OfferedSlot,
  repeatsBelow,
  slotFallback,
  slotsOf,
  slotViolation,
  toolSlots,
  withoutWrongDates,
} from '@/server/chat/slot-guard';

// Friday 6 November 2026, 10:00 in Madrid.
const NOW = Date.UTC(2026, 10, 6, 9, 0);
const HALF_HOUR = 30 * 60_000;

// What check_availability returned in the failed acceptance run: Monday
// 9 November, 08:00 to 13:00 in Madrid, every half hour.
const AVAILABILITY = {
  status: 'ok',
  timeZone: 'Europe/Madrid',
  slots: Array.from({ length: 10 }, (_, index) => {
    const start = Date.UTC(2026, 10, 9, 7, 0) + index * HALF_HOUR;
    return {
      start: new Date(start).toISOString(),
      end: new Date(start + HALF_HOUR).toISOString(),
      label: 'not read by the guard',
    };
  }),
  more: false,
};

const SLOTS = slotsOf(AVAILABILITY);

function violates(sentence: string, previous = '', slots = SLOTS): boolean {
  return slotViolation(sentence, { slots, previous, now: NOW }) !== null;
}

describe('slotsOf and toolSlots', () => {
  it('reads the slots of a check_availability result in its zone', () => {
    expect(SLOTS).toHaveLength(10);
    expect(SLOTS[0]).toEqual({
      start: Date.UTC(2026, 10, 9, 7, 0),
      end: Date.UTC(2026, 10, 9, 7, 30),
      zone: 'Europe/Madrid',
    });
    expect(
      slotsOf({ status: 'unavailable', reason: 'calendar_error' }),
    ).toEqual([]);
  });

  it('reads them back from the stored conversation, and nothing from other tools', () => {
    const messages: ModelMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'a',
            toolName: 'check_availability',
            output: { type: 'json', value: AVAILABILITY },
          },
          {
            type: 'tool-result',
            toolCallId: 'b',
            toolName: 'get_pricing',
            output: { type: 'json', value: AVAILABILITY },
          },
        ],
      },
    ];
    expect(toolSlots(messages)).toEqual(SLOTS);
  });
});

describe('slotViolation', () => {
  it.each([
    // The failure itself, and its variants.
    'martes 10 de noviembre: 09:00, 10:00, 11:00',
    'Te propongo el martes 10 de noviembre a las 09:00.',
    'Puedo el martes 10 de noviembre a las 9 de la mañana.',
    'Tuesday 10 Nov at 9am works.',
    'Tuesday 10 November, 9:00 am',
    'How about November 10 at 9:30 am?',
    // The right day at a time it does not have.
    'Monday 9 November at 2:00 pm',
    'Monday 9 November at 14:00',
    'lunes 9 de noviembre a las 15:00',
    'lunes 9 de noviembre a las 5 de la tarde',
    'Monday 9 November at 7 pm',
    // A weekday that does not match the date.
    'Tuesday 9 November at 9:00 am',
    // A time without a day that no slot has.
    'How about 7:30 pm?',
    'Te va bien a las 16:00?',
    'Puedo a las 16:30.',
    // A free day it does not have.
    'I have Tuesday 10 November free.',
    'Tengo hueco el miércoles 11 de noviembre.',
  ])('flags %j', (sentence) => {
    expect(violates(sentence)).toBe(true);
  });

  it.each([
    // The labels as check_availability writes them.
    'lunes 9 de noviembre, 08:00',
    'Monday 9 November, 8:00 am',
    'Monday 9 November, 12:30 pm',
    // Other ways of writing the same slots.
    'Monday 9 Nov at 9am',
    'Monday 9 November at 9:30',
    'el lunes 9 a las 10:30',
    'el lunes a las 11 y media',
    'lunes 9 de noviembre, de 08:00 a 13:00',
    'On Monday, November 9th at 8 a.m.',
    // Saying a day is full is not offering it.
    'El martes no tengo huecos libres.',
    'El martes 10 no hay huecos; el más cercano es el lunes 9 de noviembre a las 08:00.',
    'Tuesday 10 November is fully booked.',
    // Dates and numbers that are not slots.
    'Verifactu: las sociedades, antes del 1 de enero de 2027.',
    'Hacienda lo anunció el 5 de octubre.',
    'A typical integration goes live in 3 to 6 weeks.',
    'It costs S$8,000 and takes 2 weeks.',
    'En las 2 primeras semanas mapeamos tus herramientas.',
    'Mantenimiento: 300 / 750 / 1.500 € al mes.',
    'We reply within 24 hours.',
  ])('lets %j through', (sentence) => {
    expect(violates(sentence)).toBe(false);
  });

  it('takes the day of a bare time from what the visitor already saw', () => {
    expect(violates('8:30 am\n', 'Monday 9 November:\n')).toBe(false);
    expect(violates('9:00 am\n', 'Tuesday 10 November:\n')).toBe(true);
    expect(violates('Puedo a las 08:00.', 'El martes no hay huecos. ')).toBe(
      true,
    );
  });

  it('accepts dotted times and the short Spanish weekday', () => {
    expect(violates('Monday 9 November at 9.30am')).toBe(false);
    expect(violates('lunes 9 de noviembre a las 9.30')).toBe(false);
    expect(violates('Monday 9 November at 7.30pm')).toBe(true);
    expect(violates('mar 10 nov, 09:00')).toBe(true);
    expect(violates('lun 9 nov, 09:00')).toBe(false);
  });

  it('reads a negation only in the clause of its date', () => {
    expect(
      violates(
        'Tuesday 10 November is full, but Wednesday 11 November is free.',
      ),
    ).toBe(true);
    expect(
      violates(
        'Tuesday 10 November is full; Monday 9 November at 8:00 am works.',
      ),
    ).toBe(false);
  });

  it('reads a span of hours with no day as opening hours, not an offer', () => {
    expect(violates('We answer emails from 9am to 6pm.')).toBe(false);
    expect(violates('Atendemos de 09:00 a 18:00.')).toBe(false);
    expect(violates('Monday 9 November from 9am to 6pm')).toBe(true);
  });

  it('tells a time with no day apart from a day it was not given', () => {
    const check = (sentence: string) =>
      slotViolation(sentence, { slots: SLOTS, previous: '', now: NOW });
    expect(check('How about 7:30 pm?')).toBe('time');
    expect(check('Tuesday 10 November at 9:00 am')).toBe('date');
    expect(check('I have Tuesday 10 November free.')).toBe('date');
  });
});

describe('slotFallback', () => {
  it('names the three nearest free slots, in the reply language', () => {
    expect(slotFallback('es', SLOTS, NOW)).toBe(
      'No puedo confirmarte esa hora; solo puedo ofrecerte horas de la agenda. Las más cercanas libres son: lunes 9 de noviembre, 08:00; lunes 9 de noviembre, 08:30; lunes 9 de noviembre, 09:00.',
    );
    expect(slotFallback('en', SLOTS, NOW)).toBe(
      "I can't confirm that time; I can only offer times from the calendar. The nearest free ones are: Monday 9 November, 8:00 am; Monday 9 November, 8:30 am; Monday 9 November, 9:00 am.",
    );
  });

  it('skips slots already gone and repeats none', () => {
    const later = Date.UTC(2026, 10, 9, 11, 15);
    const twice: OfferedSlot[] = [...SLOTS, ...SLOTS];
    expect(slotFallback('en', twice, later)).toBe(
      "I can't confirm that time; I can only offer times from the calendar. The nearest free ones are: Monday 9 November, 12:30 pm.",
    );
    expect(slotFallback('en', [], NOW)).toBe(
      "I can't confirm that time; I can only offer times from the calendar.",
    );
  });
});

describe('guardSentence with a calendar', () => {
  const allowed = new Set<number>();

  it('replaces an invented slot with the real ones and reports it', () => {
    expect(
      guardSentence('Te propongo el martes 10 de noviembre a las 09:00. ', {
        locale: 'es',
        allowed,
        now: NOW,
        slots: SLOTS,
      }),
    ).toEqual({ text: `${slotFallback('es', SLOTS, NOW)} `, guard: 'slot' });
  });

  it('writes the replacement in the reply language, not the site one', () => {
    const guarded = guardSentence('Tuesday 10 Nov at 9am works.', {
      locale: 'es',
      language: 'en',
      allowed,
      now: NOW,
      slots: SLOTS,
    });
    expect(guarded.guard).toBe('slot');
    expect(guarded.text).toContain('Monday 9 November, 8:00 am');
  });

  it('checks no slot until check_availability has answered in the session', () => {
    expect(
      guardSentence('How about Monday at 9:00?', {
        locale: 'en',
        allowed,
        now: NOW,
        slots: [],
      }).guard,
    ).toBeNull();
  });

  it('replaces a time with no day but lets the reply go on', () => {
    expect(
      guardSentence('How about 7:30 pm? ', {
        locale: 'en',
        allowed,
        now: NOW,
        slots: SLOTS,
      }).guard,
    ).toBe('time');
  });

  it('checks no slot without a calendar', () => {
    expect(
      guardSentence('Tuesday 10 Nov at 9am works.', {
        locale: 'en',
        allowed,
        now: NOW,
      }).guard,
    ).toBeNull();
  });
});

describe('the replacement while chips show the times', () => {
  const base = {
    allowed: new Set<number>(),
    now: NOW,
    slots: SLOTS,
  };

  it.each([
    [
      'es',
      'Te propongo el lunes 9 de noviembre a las 16:00. ',
      'Las horas libres que tengo están debajo; elige la que te vaya bien. ',
    ],
    [
      'en',
      'How about Monday 9 November at 4:00 pm? ',
      'The free times I have are shown below; pick the one that suits you. ',
    ],
  ] as const)(
    'points at the chips, with no time in it (%s)',
    (locale, sentence, expected) => {
      const guarded = guardSentence(sentence, { ...base, locale, chips: true });
      expect(guarded).toEqual({ text: expected, guard: 'slot' });
      expect(guarded.text).not.toMatch(/\d/);
    },
  );

  it('keeps listing the nearest times when no chips show (a proposal turn)', () => {
    expect(
      guardSentence('Te propongo el lunes 9 de noviembre a las 16:00. ', {
        ...base,
        locale: 'es',
        chips: false,
      }),
    ).toEqual({ text: `${slotFallback('es', SLOTS, NOW)} `, guard: 'slot' });
  });

  it('adds no second "below" when the reply already said it', () => {
    expect(
      guardSentence('Te propongo el lunes 9 de noviembre a las 16:00.', {
        ...base,
        locale: 'es',
        chips: true,
        previous: 'Tienes horas libres el lunes; están debajo. ',
      }),
    ).toEqual({ text: '', guard: 'slot' });
  });

  it("drops the model's own 'below' after the pointer said it", () => {
    const previous =
      'Las horas libres que tengo están debajo; elige la que te vaya bien. ';
    expect(
      guardSentence('Tienes todas las horas abajo.', {
        ...base,
        locale: 'es',
        chips: true,
        previous,
      }),
    ).toEqual({ text: '', guard: null });
    expect(
      guardSentence('Tienes todas las horas abajo.', {
        ...base,
        locale: 'es',
        chips: true,
      }),
    ).toEqual({ text: 'Tienes todas las horas abajo.', guard: null });
  });

  it.each([
    'No cobramos nada por debajo de 450 €. ',
    'Abajo tienes el enlace para ver más días. ',
  ])('a "below" with no times in it is not a pointer: %s', (earlier) => {
    expect(
      guardSentence('Te propongo el lunes 9 de noviembre a las 16:00. ', {
        ...base,
        locale: 'es',
        chips: true,
        previous: earlier,
      }),
    ).toEqual({
      text: 'Las horas libres que tengo están debajo; elige la que te vaya bien. ',
      guard: 'slot',
    });
  });

  it('keeps a later "below" with no times in it after the pointer', () => {
    const previous =
      'Las horas libres que tengo están debajo; elige la que te vaya bien. ';
    expect(
      repeatsBelow('es', 'No cobramos nada por debajo de 450 €.', previous),
    ).toBe(false);
    expect(
      guardSentence('Abajo tienes el enlace para ver más días.', {
        ...base,
        locale: 'es',
        chips: true,
        previous,
      }),
    ).toEqual({
      text: 'Abajo tienes el enlace para ver más días.',
      guard: null,
    });
  });
});

describe('withoutWrongDates', () => {
  // Monday 9 November 2026.
  const MONDAY = Date.UTC(2026, 10, 9, 9, 0);
  const fix = (sentence: string, language: 'en' | 'es' = 'es') =>
    withoutWrongDates(sentence, { now: MONDAY, language });
  // The visitor asked "¿Hay hueco el domingo?": Sunday 15 November.
  const SUNDAY = {
    year: 2026,
    month: 11,
    day: 15,
    weekday: 7,
    key: '2026-11-15',
    byWeekday: true,
  };
  const forSunday = (sentence: string, language: 'en' | 'es' = 'es') =>
    withoutWrongDates(sentence, {
      now: MONDAY,
      language,
      visitorDays: [SUNDAY],
    });

  it.each([
    // The live reply, with no weekday from the visitor: the date stays.
    [
      'No hay huecos el domingo 9 de noviembre.',
      'No hay huecos el 9 de noviembre.',
    ],
    [
      'El lunes 15 de noviembre no hay huecos.',
      'El 15 de noviembre no hay huecos.',
    ],
    ['Sunday 9 November is fully booked.', '9 November is fully booked.'],
    ['Nothing on Sun 9 Nov at 3pm.', 'Nothing on 9 Nov at 3pm.'],
    ['Nothing on Sun. 9 Nov.', 'Nothing on 9 Nov.'],
    [
      'No hay nada el dom. 9 nov. por la tarde.',
      'No hay nada el 9 nov. por la tarde.',
    ],
    ['Sunday, November 9, 2026, is full.', 'November 9, 2026 is full.'],
    [
      'El martes 9 de noviembre de 2026 está completo.',
      'El 9 de noviembre de 2026 está completo.',
    ],
    // Emoji before the date (variation selectors, keycaps) shift nothing.
    ['1️⃣ Domingo 9 de noviembre: completo.', '1️⃣ 9 de noviembre: completo.'],
    [
      '✔️ domingo 9 de noviembre, libre por la tarde.',
      '✔️ 9 de noviembre, libre por la tarde.',
    ],
  ])('keeps the date and drops the weekday in %j', (sentence, expected) => {
    expect(fix(sentence)).toBe(expected);
  });

  it.each([
    [
      'No hay huecos el domingo 9 de noviembre.',
      'No hay huecos el domingo 15 de noviembre.',
      'es',
    ],
    [
      '1️⃣ Domingo 9 de noviembre: completo.',
      '1️⃣ Domingo 15 de noviembre: completo.',
      'es',
    ],
    [
      'Sunday 9 November is fully booked.',
      'Sunday 15 November is fully booked.',
      'en',
    ],
    [
      'Nothing on Sun 9 Nov at 3pm.',
      'Nothing on Sunday 15 November at 3pm.',
      'en',
    ],
  ] as const)(
    'writes the date the visitor meant in %j',
    (sentence, expected, language) => {
      expect(forSunday(sentence, language)).toBe(expected);
    },
  );

  it('drops the weekday when it is not the one the visitor named', () => {
    expect(forSunday('El lunes 15 de noviembre no hay huecos.')).toBe(
      'El 15 de noviembre no hay huecos.',
    );
  });

  it.each([
    'Monday 9 November, 8:00 am',
    'lunes 9 de noviembre, 08:00',
    'No hay huecos el domingo 15 de noviembre.',
    'Mon 9 Nov at 9am works.',
    'El domingo no hay huecos.',
    'Verifactu: las sociedades, antes del 1 de enero de 2027.',
    // May 14 is a Friday next year.
    'El viernes 14 de mayo lanzamos.',
  ])('leaves %j as it is', (sentence) => {
    expect(fix(sentence)).toBeNull();
  });

  it('reads a date without a year as its next occurrence from today', () => {
    const december = Date.UTC(2026, 11, 28, 9, 0);
    const at = (sentence: string) =>
      withoutWrongDates(sentence, { now: december, language: 'es' });
    // The next 2 January is Saturday 2 January 2027.
    expect(at('sábado 2 de enero')).toBeNull();
    expect(at('viernes 2 de enero')).toBe('2 de enero');
  });

  it('runs inside guardSentence, on any sentence, booking or not, and reports it', () => {
    const options = {
      locale: 'es' as const,
      allowed: new Set<number>(),
      now: MONDAY,
    };
    expect(
      guardSentence('No hay huecos el domingo 9 de noviembre. ', options),
    ).toEqual({ text: 'No hay huecos el 9 de noviembre. ', guard: 'weekday' });
    expect(
      guardSentence('No hay huecos el domingo 9 de noviembre. ', {
        ...options,
        visitorDays: [SUNDAY],
      }),
    ).toEqual({
      text: 'No hay huecos el domingo 15 de noviembre. ',
      guard: 'weekday',
    });
  });
});
