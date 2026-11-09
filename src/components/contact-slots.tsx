import { type ReactNode, Suspense, use, useState } from 'react';
import type { DeskCopy } from '@/content/types';
import { afterLoadAndIdle } from '@/lib/after-idle';
import type { Locale } from '@/lib/i18n';
import type { ReadySlots } from '@/lib/next-slots-load';

// One promise per locale for the page's life, over the loader's shared
// five-minute cache (one fetch with the desk), after load and idle. A failure
// is not kept: the next mount tries again, and meanwhile the link to all
// times stays. The desk's store itself is not imported: that would split it
// out of home's first JavaScript.
const loads = new Map<Locale, Promise<ReadySlots | null>>();

function nextFor(locale: Locale): Promise<ReadySlots | null> {
  const known = loads.get(locale);
  if (known) return known;
  const ready = afterLoadAndIdle()
    .then(() => import('@/lib/next-slots-load'))
    .then(async (loader) =>
      loader.nextSlots(await loader.loadAvailability(), locale),
    )
    .catch(() => null)
    .then((result) => {
      if (result === null) loads.delete(locale);
      return result;
    });
  loads.set(locale, ready);
  return ready;
}

type SlotsCopy = DeskCopy['slots'];

function Times({
  copy,
  locale,
  fallback,
  slots,
}: {
  copy: SlotsCopy;
  locale: Locale;
  fallback: ReactNode;
  slots: Promise<ReadySlots | null>;
}) {
  const ready = use(slots);
  if (ready === null) return fallback;
  return (
    <>
      <div className="desk-rail-head">
        <h2 className="text-ui-l font-semibold">{copy.title}</h2>
        <p className="desk-rail-meta" data-slot-meta>
          {`${ready.day} · ${copy.timesIn.replace('{zone}', ready.zone)}`}
        </p>
      </div>
      <ready.Chips
        chips={ready.chips}
        locale={locale}
        group={copy.group}
        seeAll={copy.seeAll}
        cta="contact_book"
        seeAllCta="contact_book"
      />
    </>
  );
}

// The contact page's booking card, once hydrated: the next free times as the
// desk's chips, in the same two-row box as the link it replaces. The promise
// is held for this mount, so a failure shows the link until the next visit.
export function ContactSlots({
  copy,
  locale,
  fallback,
}: {
  copy: SlotsCopy;
  locale: Locale;
  fallback: ReactNode;
}) {
  const [slots] = useState(() => nextFor(locale));
  return (
    <Suspense fallback={fallback}>
      <Times copy={copy} locale={locale} fallback={fallback} slots={slots} />
    </Suspense>
  );
}
