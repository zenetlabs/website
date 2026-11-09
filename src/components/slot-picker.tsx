import { useState } from 'react';
import type { BookPageContent } from '@/content/types';
import type { PageSlot } from '@/lib/booking-client';
import type { Locale } from '@/lib/i18n';
import { formatDayParts, formatTimeParts } from '@/lib/slot-format';
import { groupByDay } from '@/lib/slots';

function timesText(copy: BookPageContent['picker'], count: number): string {
  return count === 1
    ? copy.times.one
    : copy.times.other.replace('{n}', String(count));
}

// A week strip of days (real radios) and the chosen day's times (real radios
// too, never `required`: a hidden day cannot show the browser's message, so the
// form asks for a time itself).
// `picked` may be a slot from the home desk (`/book?slot=`); its day opens.
export function SlotPicker({
  slots,
  zone,
  locale,
  copy,
  picked,
  onPick,
}: {
  slots: readonly PageSlot[];
  zone: string;
  locale: Locale;
  copy: BookPageContent['picker'];
  picked: number | null;
  onPick: (start: number) => void;
}) {
  const days = groupByDay(slots, zone);
  const pickedDay = days.find(({ entries }) =>
    entries.some(({ slot }) => slot.start === picked),
  )?.date;
  const [chosenDay, setChosenDay] = useState(pickedDay ?? null);
  // A refreshed list may have lost the chosen day: the first day shows instead.
  const shown =
    days.find(({ date }) => date === chosenDay) ??
    days.find(({ date }) => date === pickedDay) ??
    days[0];
  return (
    <div className="grid min-w-0 gap-5" data-slot-picker>
      <fieldset className="min-w-0">
        <legend className="sr-only">{copy.days}</legend>
        <div className="week-strip">
          {days.map(({ date, entries }) => {
            const first = entries[0];
            if (first === undefined) return null;
            const name = formatDayParts(locale, first.parts);
            // "Tuesday 10 November" / "martes 10 de noviembre": Tue, 10 Nov
            const [weekday = '', day = '', ...rest] = name.split(' ');
            return (
              <label key={date} className="day-chip">
                <input
                  type="radio"
                  name="day"
                  value={date}
                  checked={shown?.date === date}
                  onChange={() => setChosenDay(date)}
                  className="sr-only"
                />
                <span className="day-chip-weekday">{weekday.slice(0, 3)}</span>{' '}
                <span className="day-chip-date">
                  {day} {(rest.at(-1) ?? '').slice(0, 3)}
                </span>
                <span className="sr-only">
                  , {timesText(copy, entries.length)}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {/* Every day's times stay in the form (the others hidden), so a time
          picked on one day is still sent after looking at another. */}
      {days.map(({ date, entries }) => {
        const first = entries[0];
        if (first === undefined) return null;
        return (
          <fieldset
            key={date}
            data-day={date}
            hidden={date !== shown?.date}
            className="grid min-w-0 gap-3"
          >
            <legend className="mb-3 flex w-full items-baseline justify-between gap-4 font-semibold">
              <span>{formatDayParts(locale, first.parts)}</span>
              <span className="text-ui-s font-normal text-muted-fg">
                {timesText(copy, entries.length)}
              </span>
            </legend>
            <div className="time-grid">
              {entries.map(({ slot, parts }) => (
                <label key={slot.start} className="time-chip">
                  <input
                    type="radio"
                    name="slot"
                    value={new Date(slot.start).toISOString()}
                    checked={slot.start === picked}
                    onChange={() => onPick(slot.start)}
                    className="sr-only"
                  />
                  {formatTimeParts(locale, parts)}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
