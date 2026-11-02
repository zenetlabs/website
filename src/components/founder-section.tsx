import { RichText } from '@/components/rich-text';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { LEAD, TEXT_LINK } from '@/components/ui';
import type { Founder, HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function FounderPortrait({ founder }: { founder: Founder }) {
  const { photo } = founder;
  if (photo) {
    return (
      <img
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="size-20 rounded-full border border-hairline object-cover md:size-24"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-3xl md:size-24 md:text-4xl"
    >
      {initials(founder.name)}
    </span>
  );
}

export function FounderSection({
  copy,
  founder,
  locale,
}: {
  copy: HomeContent['founder'];
  founder: Founder;
  locale: Locale;
}) {
  const { ground, bg } = sectionFrame('tint');

  return (
    <section
      id="founder"
      aria-labelledby="founder-title"
      data-ground={ground}
      className={bg}
    >
      <Container className="grid gap-6 py-section-compact md:grid-cols-[auto_1fr] md:gap-12">
        <div className="max-md:hidden">
          <FounderPortrait founder={founder} />
        </div>
        <div>
          <h2 id="founder-title" className="max-w-3xl text-h2-compact">
            <EmphasisTitle parts={copy.title} />
          </h2>
          <p className="mt-5 font-display text-h3">{founder.name}</p>
          <p className="mt-1 text-ui-s text-muted-fg">{founder.role}</p>
          <p className={`mt-3 ${LEAD} max-md:text-ui-m`}>
            <RichText parts={founder.bio} />
          </p>
          <p className="mt-5">
            <a
              href={pagePath(locale, 'about')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.more} →
            </a>
          </p>
        </div>
      </Container>
    </section>
  );
}
