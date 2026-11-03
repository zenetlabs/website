import { CONTROL, Field } from '@/components/form-parts';
import { BOOKING_TIME_ZONES } from '@/content/booking-rules';
import type { BookPageContent } from '@/content/types';
import { curatedZone, zoneLabel } from '@/lib/zone-label';

export function ZoneSelect({
  zone,
  action,
  copy,
  onChange,
}: {
  zone: string;
  action: string;
  copy: BookPageContent['zone'];
  onChange: (zone: string) => void;
}) {
  const options: string[] =
    curatedZone(zone) === undefined
      ? [zone, ...BOOKING_TIME_ZONES]
      : [...BOOKING_TIME_ZONES];
  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-end gap-3"
    >
      <Field label={copy.label}>
        {(id) => (
          <select
            id={id}
            name="tz"
            value={zone}
            onChange={(event) => onChange(event.currentTarget.value)}
            className={`${CONTROL} sm:w-72`}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {zoneLabel(copy, option)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <noscript>
        <button
          type="submit"
          className="min-h-12 rounded-input border border-fg px-4 text-ui-m font-medium text-fg"
        >
          {copy.show}
        </button>
      </noscript>
    </form>
  );
}
