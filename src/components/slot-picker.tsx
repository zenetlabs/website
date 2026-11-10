import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import type { BookPageContent } from '@/content/types';
import {
  type BookingCalendar,
  type CalendarCell,
  type CalendarHoliday,
  type CalendarModel,
  type CalendarMonth,
  calendarModel,
} from '@/lib/booking-calendar';
import type { PageSlot } from '@/lib/booking-client';
import type { Locale } from '@/lib/i18n';
import {
  formatDayParts,
  formatTimeParts,
  MONTHS,
  WEEKDAYS,
} from '@/lib/slot-format';
import { dateKey, groupByDay, zonedParts } from '@/lib/slots';

type Picker = BookPageContent['picker'];
type HolidayCell = CalendarCell & { holidays: CalendarHoliday[] };

function isHoliday(cell: CalendarCell): cell is HolidayCell {
  return cell.status === 'holiday';
}
type Padded = { key: string; cell: CalendarCell | null };

function timesText(copy: Picker, count: number): string {
  return count === 1
    ? copy.times.one
    : copy.times.other.replace('{n}', String(count));
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Christmas Day (Spain, Singapore)": one name per holiday, its places after.
function holidayNames(
  copy: Picker,
  locale: Locale,
  holidays: readonly CalendarHoliday[],
): string {
  const byName = new Map<string, string[]>();
  for (const { region, name } of holidays) {
    const places = byName.get(name[locale]) ?? [];
    const place = copy.regions[region];
    if (!places.includes(place)) places.push(place);
    byName.set(name[locale], places);
  }
  return [...byName]
    .map(([name, places]) => `${name} (${places.join(', ')})`)
    .join('; ');
}

// "Monday to Thursday" for consecutive days, else "Monday, Wednesday and Friday".
function openDays(copy: Picker, locale: Locale, weekdays: readonly number[]) {
  const sorted = [...weekdays].sort((a, b) => a - b);
  const names = sorted.map((weekday) => WEEKDAYS[locale][weekday - 1] ?? '');
  const first = names[0] ?? '';
  const last = names.at(-1) ?? '';
  if (names.length > 2 && sorted.every((day, at) => day - at === sorted[0])) {
    return copy.dayList.range.replace('{from}', first).replace('{to}', last);
  }
  return names.length < 2
    ? first
    : `${names.slice(0, -1).join(', ')} ${copy.dayList.and} ${last}`;
}

function dayName(locale: Locale, cell: CalendarCell): string {
  return formatDayParts(locale, { ...cell, hour: 0, minute: 0 });
}

function caption(locale: Locale, { year, month }: CalendarMonth): string {
  const name = capitalized(MONTHS[locale][month - 1] ?? '');
  return locale === 'en' ? `${name} ${year}` : `${name} de ${year}`;
}

function weeksOf(month: CalendarMonth): { key: string; days: Padded[] }[] {
  const padded: Padded[] = [];
  for (let at = 0; at < month.lead; at += 1) {
    padded.push({ key: `lead-${at}`, cell: null });
  }
  for (const cell of month.cells) padded.push({ key: cell.date, cell });
  for (let at = 0; padded.length % 7 !== 0; at += 1) {
    padded.push({ key: `tail-${at}`, cell: null });
  }
  const weeks: { key: string; days: Padded[] }[] = [];
  for (let at = 0; at < padded.length; at += 7) {
    weeks.push({ key: `week-${at / 7}`, days: padded.slice(at, at + 7) });
  }
  return weeks;
}

// The WAI-ARIA date grid keys as moves in the model's run of days: a day, a
// week, the week's ends (inside its month) and the same day a month away.
function moved(model: CalendarModel, at: number, key: string): number | null {
  const cell = model.cells[at];
  const month = model.months.findIndex(
    ({ start, cells }) => at >= start && at < start + cells.length,
  );
  const current = model.months[month];
  if (!cell || !current) return null;
  const lastDay = current.start + current.cells.length - 1;
  switch (key) {
    case 'ArrowLeft':
      return at - 1;
    case 'ArrowRight':
      return at + 1;
    case 'ArrowUp':
      return at - 7;
    case 'ArrowDown':
      return at + 7;
    case 'Home':
      return Math.max(at - cell.weekday + 1, current.start);
    case 'End':
      return Math.min(at + 7 - cell.weekday, lastDay);
    case 'PageUp':
    case 'PageDown': {
      const other = model.months[month + (key === 'PageUp' ? -1 : 1)];
      return other
        ? other.start + Math.min(cell.day, other.cells.length) - 1
        : at;
    }
    default:
      return null;
  }
}

// A month table per month to the horizon: named day buttons with the
// WAI-ARIA date grid keys and one tab stop (closed days stay focusable with
// their reason), then the chosen day's times as real radios, never
// `required`: a hidden day cannot show the browser's message, so the form
// asks for a time itself.
// `picked` may be a slot from the home desk (`/book?slot=`); its day opens.
export function SlotPicker({
  slots,
  calendar,
  zone,
  locale,
  copy,
  picked,
  onPick,
  rootRef,
}: {
  slots: readonly PageSlot[];
  calendar: BookingCalendar;
  zone: string;
  locale: Locale;
  copy: Picker;
  picked: number | null;
  onPick: (start: number) => void;
  // Called with the root once the calendar is in the page.
  rootRef?: (node: HTMLDivElement | null) => void;
}) {
  const { days, model, weeks, holidays, reasons } = useMemo(() => {
    const built = calendarModel(calendar, slots, zone);
    const off = copy.closed.off.replace(
      '{days}',
      openDays(copy, locale, calendar.weekdays),
    );
    return {
      days: groupByDay(slots, zone),
      model: built,
      weeks: built.months.map(weeksOf),
      holidays: built.cells.filter(isHoliday),
      // Each day's reason, read with its date and shown as its tooltip.
      reasons: built.cells.map((cell) => {
        if (cell.status === 'open') return timesText(copy, cell.count);
        if (cell.status === 'off') return off;
        return cell.status === 'holiday'
          ? copy.closed.holiday.replace(
              '{name}',
              holidayNames(copy, locale, cell.holidays),
            )
          : copy.closed[cell.status];
      }),
    };
  }, [calendar, slots, zone, locale, copy]);
  // The shown day is kept as an instant, so it stays the same day when the
  // zone changes (the server's zone, then the browser's).
  const [chosenAt, setChosenAt] = useState<number | null>(null);
  // The roving tab stop: the day last moved to while it is still drawn, else
  // the shown day (a refreshed list may have dropped either).
  const [focused, setFocused] = useState<string | null>(null);
  const grid = useRef<HTMLFieldSetElement>(null);
  const at = chosenAt ?? picked;
  const atDay = at === null ? null : dateKey(zonedParts(at, zone));
  const shown = days.find(({ date }) => date === atDay) ?? days[0];
  const stop =
    (focused !== null && model.index.has(focused) ? focused : shown?.date) ??
    model.cells[0]?.date;

  function onKeyDown(event: KeyboardEvent<HTMLFieldSetElement>) {
    const from =
      event.target instanceof HTMLElement
        ? model.index.get(event.target.dataset.date ?? '')
        : undefined;
    if (from === undefined) return;
    const next = moved(model, from, event.key);
    if (next === null) return;
    event.preventDefault();
    const date = model.cells[next]?.date;
    if (date === undefined) return;
    setFocused(date);
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)
      ?.focus();
  }

  return (
    <div ref={rootRef} className="slot-picker" data-slot-picker>
      <div className="grid min-w-0 content-start gap-5">
        <fieldset ref={grid} className="cal-months" onKeyDown={onKeyDown}>
          <legend className="sr-only">{copy.days}</legend>
          {model.months.map((month, index) => (
            <table key={`${month.year}-${month.month}`} className="cal-month">
              <caption className="cal-caption">
                {caption(locale, month)}
              </caption>
              <thead>
                <tr>
                  {copy.weekdays.map((short, index) => (
                    <th key={short} scope="col" abbr={WEEKDAYS[locale][index]}>
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks[index]?.map((week) => (
                  <tr key={week.key}>
                    {week.days.map(({ key, cell }) =>
                      cell === null ? (
                        <td key={key} />
                      ) : (
                        <td key={key}>
                          <DayButton
                            cell={cell}
                            reason={reasons[model.index.get(cell.date) ?? -1]}
                            name={dayName(locale, cell)}
                            selected={cell.date === shown?.date}
                            active={cell.date === stop}
                            today={cell.date === model.today}
                            onSelect={() => {
                              setFocused(cell.date);
                              const first = days.find(
                                ({ date }) => date === cell.date,
                              )?.entries[0];
                              if (first) setChosenAt(first.slot.start);
                            }}
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </fieldset>
        <HolidayNote copy={copy} locale={locale} holidays={holidays} />
      </div>
      <div className="min-w-0">
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
              <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-x-4 font-semibold">
                <span>{capitalized(formatDayParts(locale, first.parts))}</span>
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
    </div>
  );
}

function HolidayNote({
  copy,
  locale,
  holidays,
}: {
  copy: Picker;
  locale: Locale;
  holidays: readonly HolidayCell[];
}) {
  if (holidays.length === 0) return null;
  return (
    <div className="cal-note">
      <p className="font-semibold text-fg">{copy.holidays}</p>
      <ul className="mt-1 grid gap-1">
        {holidays.map((cell) => (
          <li key={cell.date} className="cal-note-item">
            {capitalized(dayName(locale, cell))}:{' '}
            {holidayNames(copy, locale, cell.holidays)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayButton({
  cell,
  name,
  reason = '',
  selected,
  active,
  today,
  onSelect,
}: {
  cell: CalendarCell;
  name: string;
  reason: string | undefined;
  selected: boolean;
  active: boolean;
  today: boolean;
  onSelect: () => void;
}) {
  const open = cell.status === 'open';
  return (
    <button
      type="button"
      className="cal-day"
      data-date={cell.date}
      data-status={cell.status}
      tabIndex={active ? 0 : -1}
      aria-label={`${name}, ${reason}`}
      aria-pressed={open ? selected : undefined}
      aria-disabled={open ? undefined : true}
      aria-current={today ? 'date' : undefined}
      title={open ? undefined : capitalized(reason)}
      onClick={onSelect}
    >
      {cell.day}
    </button>
  );
}
