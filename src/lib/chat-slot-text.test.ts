import { describe, expect, it } from 'vitest';
import { offeredTimes, withoutListedTimes } from '@/lib/chat-slot-text';

const MADRID = 'Europe/Madrid';
const HOUR = 3_600_000;
// Monday 9 November 2026 in Madrid (UTC+1): 08:00, 08:30, 09:00.
const DAY = Date.UTC(2026, 10, 9, 7);
const OFFERED = offeredTimes([DAY, DAY + HOUR / 2, DAY + HOUR], MADRID);
// The same day: 08:00, 10:00 and 16:00.
const SPREAD = offeredTimes([DAY, DAY + 2 * HOUR, DAY + 8 * HOUR], MADRID);
// Two days: Monday 08:00 and Tuesday 10 November 08:00.
const TWO_DAYS = offeredTimes([DAY, DAY + 24 * HOUR], MADRID);

describe('withoutListedTimes', () => {
  it('drops the list a real reply carried, with its day heading, and keeps the prose', () => {
    const reply =
      'Sí, hay huecos disponibles la semana que viene. Te propongo:\n\nLunes 9 de noviembre:\n- 08:00\n- 08:30\n- 09:00\n\n¿Cuál te conviene?';
    expect(withoutListedTimes(reply, OFFERED)).toBe(
      'Sí, hay huecos disponibles la semana que viene.\n\n¿Cuál te conviene?',
    );
  });

  it('reads 12-hour times and full labels', () => {
    const reply =
      'These are the next free times:\n- Monday 9 November, 8:00 am\n* 8:30 a.m.\n1. 9:00 AM\nWhich one suits you?';
    expect(withoutListedTimes(reply, OFFERED)).toBe('Which one suits you?');
  });

  it('never touches prices in a list next to chips at 8:00, 10:00 and 16:00 (en, es)', () => {
    const es =
      'Precios:\n- Diagnóstico: 1.500 €\n- 4.000 €\n- Agente de IA: 8.000–20.000 €\n- 10.000 €\nLunes 9 de noviembre:\n- 08:00\n- 10:00\n- 16:00';
    expect(withoutListedTimes(es, SPREAD)).toBe(
      'Precios:\n- Diagnóstico: 1.500 €\n- 4.000 €\n- Agente de IA: 8.000–20.000 €\n- 10.000 €',
    );
    const en =
      'Prices:\n- Diagnostic: S$3,000\n- 4.000\n- 10.00 to 16.00 hours of work\nMonday 9 November:\n- 8:00 am\n- 10:00 am\n- 4:00 pm';
    expect(withoutListedTimes(en, SPREAD)).toBe(
      'Prices:\n- Diagnostic: S$3,000\n- 4.000\n- 10.00 to 16.00 hours of work',
    );
  });

  it('keeps a list item that says more than a time (en, es)', () => {
    const es =
      'Te propongo:\n- La llamada es el lunes 9 de noviembre a las 10:00 por Google Meet';
    expect(withoutListedTimes(es, SPREAD)).toBe(es);
    const en = 'Options:\n- The call starts at 10:00 am on Monday 9 November';
    expect(withoutListedTimes(en, SPREAD)).toBe(en);
  });

  it('keeps the same time on a day the chips do not carry (en, es)', () => {
    const es = 'Martes 10 de noviembre:\n- 08:30';
    expect(withoutListedTimes(es, OFFERED)).toBe(es);
    const en = 'Options:\n- Wednesday 11 November, 8:00 am';
    expect(withoutListedTimes(en, OFFERED)).toBe(en);
  });

  it('needs the day when the chips span several days', () => {
    expect(withoutListedTimes('Options:\n- 8:00 am', TWO_DAYS)).toBe(
      'Options:\n- 8:00 am',
    );
    expect(
      withoutListedTimes('Tuesday 10 November:\n- 8:00 am\nOk?', TWO_DAYS),
    ).toBe('Ok?');
  });

  it('keeps a list item whose time the chips do not carry, and its heading', () => {
    const reply = 'Monday 9 November:\n- 08:00\n- 15:15\nOk?';
    expect(withoutListedTimes(reply, OFFERED)).toBe(
      'Monday 9 November:\n- 15:15\nOk?',
    );
  });

  it('never touches times written in a sentence', () => {
    const reply = 'I can do 08:00 or 08:30 on Monday.';
    expect(withoutListedTimes(reply, OFFERED)).toBe(reply);
  });

  it('drops the last sentence of a lead-in whose list went, keeping earlier ones (en, es)', () => {
    expect(
      withoutListedTimes(
        'Sunday 15 November is fully booked. The nearest free times are:\n- Monday 9 November, 8:00 am\n- Monday 9 November, 8:30 am',
        OFFERED,
      ),
    ).toBe('Sunday 15 November is fully booked.');
    expect(
      withoutListedTimes(
        'These are the next free times:\n- 8:00 am\n- 8:30 am\nWhich one suits you?',
        OFFERED,
      ),
    ).toBe('Which one suits you?');
    expect(
      withoutListedTimes(
        'El domingo está completo. Las horas libres más cercanas son:\nlunes 9 de noviembre:\n- 08:00\n- 08:30',
        OFFERED,
      ),
    ).toBe('El domingo está completo.');
    expect(
      withoutListedTimes(
        'Hay sitio. ¿Te va bien alguna de estas:\n- 08:00\n- 08:30',
        OFFERED,
      ),
    ).toBe('Hay sitio.');
  });

  it('leaves one blank line where a list went, and none at the ends', () => {
    expect(
      withoutListedTimes(
        '\n  \nFree times\n\n- 08:00\n  \n- 08:30\n\n\nWhich one suits you?\n  \n',
        OFFERED,
      ),
    ).toBe('Free times\n\nWhich one suits you?');
  });

  it('keeps a lead-in whose list stayed', () => {
    expect(withoutListedTimes('Options:\n- 15:15', OFFERED)).toBe(
      'Options:\n- 15:15',
    );
  });

  it('returns nothing when the reply was only the list', () => {
    expect(withoutListedTimes('- 08:00\n- 08:30', OFFERED)).toBe('');
  });
});
