import { CtaLink } from '@/components/cta-link';
import { SECONDARY_BUTTON } from '@/components/ui';
import type { DeskCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { navHref } from '@/lib/nav';
import { useNextSlots } from '@/lib/next-slots';
import { pagePath } from '@/lib/page-registry';

type SlotCopy = DeskCopy['slots'];

// Booking is published: the next real times arrive after load and idle, in a
// row that keeps its height in every state. Until then, or when the fetch
// fails or finds nothing, one link opens all times on /book.
function LiveSlots({ copy, locale }: { copy: SlotCopy; locale: Locale }) {
  const state = useNextSlots(locale);
  const book = pagePath(locale, 'book');
  const ready = state.status === 'ready' ? state : null;
  return (
    <>
      <div className="desk-rail-head">
        <h3 className="text-ui-l font-semibold">{copy.title}</h3>
        {/* A new node when the times arrive: replacing it is not a layout shift */}
        <p
          key={ready ? 'ready' : 'waiting'}
          className="desk-rail-meta"
          data-slot-meta
        >
          {ready
            ? `${ready.day} · ${copy.timesIn.replace('{zone}', ready.zone)}`
            : copy.meta}
        </p>
      </div>
      {ready ? (
        <ready.Chips
          chips={ready.chips}
          locale={locale}
          group={copy.group}
          seeAll={copy.seeAll}
        />
      ) : (
        <div className="grid gap-2" data-slot-fallback={state.status}>
          <CtaLink cta="desk_times" href={book} className={SECONDARY_BUTTON}>
            {copy.seeAvailable}
          </CtaLink>
          <p className="slot-alt">
            <CtaLink
              cta="desk_contact"
              href={navHref(locale, { page: 'contact' })}
              className="font-semibold text-link underline"
            >
              {copy.message}
            </CtaLink>
          </p>
        </div>
      )}
    </>
  );
}

export function SlotRail({
  copy,
  locale,
  booking,
  className = 'desk-rail',
}: {
  copy: SlotCopy;
  locale: Locale;
  booking: boolean;
  className?: string;
}) {
  return (
    <div className={className} data-slot-rail={booking ? 'live' : 'off'}>
      {booking ? (
        <LiveSlots copy={copy} locale={locale} />
      ) : (
        <>
          <h3 className="text-ui-l font-semibold">{copy.title}</h3>
          <p className="text-ui-s text-fg-soft">{copy.unavailable}</p>
          <CtaLink
            cta="desk_contact"
            href={navHref(locale, { page: 'contact' })}
            className={SECONDARY_BUTTON}
          >
            {copy.message}
          </CtaLink>
        </>
      )}
    </div>
  );
}
