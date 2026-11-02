import { RichText } from '@/components/rich-text';
import { Container, EmphasisTitle } from '@/components/section';
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
        className="size-28 rounded-full border border-hairline object-cover md:size-36"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-28 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-4xl md:size-36 md:text-5xl"
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
  return (
    <section id="founder" aria-labelledby="founder-title" data-ground="paper">
      <Container className="grid gap-10 py-section md:grid-cols-[auto_1fr] md:gap-14">
        <FounderPortrait founder={founder} />
        <div>
          <h2 id="founder-title" className="max-w-3xl">
            <EmphasisTitle parts={copy.title} />
          </h2>
          <p className="mt-6 font-display text-h3">{founder.name}</p>
          <p className="mt-1 text-ui-s text-muted-fg">{founder.role}</p>
          <p className={`mt-6 ${LEAD}`}>
            <RichText parts={founder.bio} />
          </p>
          <p className="mt-8">
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
