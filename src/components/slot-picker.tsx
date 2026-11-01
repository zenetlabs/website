import type { BookPageContent } from '@/content/types';
import type { PageSlot } from '@/lib/booking-client';
import type { Locale } from '@/lib/i18n';
import { formatDayParts, formatTimeParts } from '@/lib/slot-format';
import { groupByDay } from '@/lib/slots';

const OPEN_DAYS = 2;
const CHIP =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-input border border-hairline bg-surface px-3.5 py-2 text-sm has-checked:border-accent';

function timesText(copy: BookPageContent['picker'], count: number): string {
  return count === 1
    ? copy.times.one
    : copy.times.other.replace('{n}', String(count));
}

export function SlotPicker({
  slots,
  zone,
  locale,
  copy,
}: {
  slots: readonly PageSlot[];
  zone: string;
  locale: Locale;
  copy: BookPageContent['picker'];
}) {
  return (
    <div className="grid gap-3">
      {groupByDay(slots, zone).map(({ date, entries }, index) => {
        const first = entries[0];
        if (first === undefined) return null;
        const name = formatDayParts(locale, first.parts);
        return (
          <details
            key={date}
            open={index < OPEN_DAYS}
            className="rounded-card border border-hairline bg-surface px-4"
          >
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 font-medium">
              <span>{name}</span>
              <span className="text-sm font-normal text-muted-fg">
                {timesText(copy, entries.length)}
              </span>
            </summary>
            <fieldset className="flex flex-wrap gap-2 pb-4">
              <legend className="sr-only">{name}</legend>
              {entries.map(({ slot, parts }) => (
                <label key={slot.start} className={CHIP}>
                  <input
                    type="radio"
                    name="slot"
                    value={new Date(slot.start).toISOString()}
                    required
                    className="size-4 shrink-0 accent-accent"
                  />
                  {formatTimeParts(locale, parts)}
                </label>
              ))}
            </fieldset>
          </details>
        );
      })}
    </div>
  );
}
