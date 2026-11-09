import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { TEXT_LINK } from '@/components/ui';
import type { Founder, HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { initials } from '@/lib/initials';
import { pagePath } from '@/lib/page-registry';
import { PORTFOLIO } from '@/lib/portfolio';

export function CompanyMark({
  name,
  logo,
}: {
  name: string;
  logo: (typeof PORTFOLIO)[number]['logo'];
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="logo"
        style={{
          '--logo': `url(${logo.src})`,
          aspectRatio: `${logo.width} / ${logo.height}`,
        }}
      />
      <span className="sr-only">{name}</span>
    </>
  );
}

export function CompaniesStrip({
  copy,
  more,
  locale,
}: {
  copy: HomeContent['companies'];
  more?: string;
  locale: Locale;
}) {
  const { ground, bg } = sectionFrame('default');

  return (
    <section
      id="companies"
      aria-labelledby="companies-title"
      data-ground={ground}
      className={bg}
    >
      <Container className="py-7 md:py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2
            id="companies-title"
            className="font-sans text-ui-l font-medium text-fg-soft"
          >
            {copy.title}
          </h2>
          {more ? (
            <a
              href={pagePath(locale, 'cases')}
              className={`inline-flex min-h-11 items-center font-medium ${TEXT_LINK}`}
            >
              {more} →
            </a>
          ) : null}
        </div>
        <ul className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-1 md:mt-6 md:gap-y-5">
          {PORTFOLIO.map(({ key, name, href, logo }) => (
            <li key={key}>
              <a href={href} className="company-link min-h-11 justify-center">
                <CompanyMark name={name} logo={logo} />
                <span className="text-ui-s text-muted-fg max-md:sr-only">
                  {copy.items[key].category}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

// The founder: his photo, or his initials, in the amber ring of a person.
export function FounderPortrait({
  founder,
  className = 'size-20 text-3xl md:size-24 md:text-4xl',
}: {
  founder: Founder;
  className?: string;
}) {
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
        className={`monogram object-cover ${className}`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`monogram ${className}`}>
      {initials(founder.name)}
    </span>
  );
}
