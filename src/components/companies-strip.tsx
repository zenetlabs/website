import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import type { HomeContent } from '@/content/types';
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

export function CompaniesStrip({ copy }: { copy: HomeContent['companies'] }) {
  const { ground, bg } = sectionFrame('tint');

  return (
    <section
      id="companies"
      aria-labelledby="companies-title"
      data-ground={ground}
      className={bg}
    >
      <Container className="py-10 md:py-12">
        <h2
          id="companies-title"
          className="font-sans text-ui-l font-medium text-fg-soft"
        >
          {copy.title}
        </h2>
        <ul className="mt-6 flex flex-wrap justify-between gap-x-3 gap-y-5">
          {PORTFOLIO.map(({ key, name, href, logo }) => (
            <li key={key}>
              <a href={href} className="company-link">
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
