import { CompanyMark } from '@/components/companies-strip';
import { BulletList } from '@/components/lists';
import { Container, Section } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import type { ServicePageContent, ServicePageLabels } from '@/content/types';
import { crumbName, type Names } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { breadcrumbTrail, type PageId, pagePath } from '@/lib/page-registry';
import { portfolioOf } from '@/lib/portfolio';

// A service page's proof: the company it runs at (its logo), what changed
// there, and the way to the full case and the hub.
export function CaseCallout({
  copy,
  locale,
  names,
}: {
  copy: ServicePageContent['case'];
  locale: Locale;
  names: Names;
}) {
  const company = copy.company ? portfolioOf(copy.company) : undefined;
  return (
    <Section id="case" title={copy.title}>
      <div className="case-callout">
        <div className="lg:col-span-7">
          {company ? (
            <CompanyMark name={company.name} logo={company.logo} />
          ) : null}
          <p className={company ? 'mt-4 text-fg-soft md:mt-5' : 'text-fg-soft'}>
            {copy.text}
          </p>
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-3 md:mt-6 md:gap-x-8">
            {copy.page ? (
              <a
                href={pagePath(locale, copy.page)}
                className={`font-medium ${TEXT_LINK}`}
              >
                {crumbName(names, copy.page)}
              </a>
            ) : null}
            <a
              href={pagePath(locale, 'cases')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {crumbName(names, 'cases')}
            </a>
          </p>
        </div>
        <BulletList
          items={copy.points}
          marker="tick"
          className="lg:col-span-5"
        />
      </div>
    </Section>
  );
}

export function Breadcrumb({
  page,
  locale,
  names,
  label,
}: {
  page: PageId;
  locale: Locale;
  names: Names;
  label: string;
}) {
  const trail = breadcrumbTrail(page);
  return (
    <nav aria-label={label} className="text-sm text-muted-fg">
      <ol className="flex items-center gap-2 whitespace-nowrap">
        {trail.map((step, index) => {
          const name = crumbName(names, step);
          return index === trail.length - 1 ? (
            <li key={step} className="min-w-0">
              <span aria-current="page" className="block truncate">
                {name}
              </span>
            </li>
          ) : (
            <li key={step} className="flex shrink-0 gap-2">
              <a href={pagePath(locale, step)} className={TEXT_LINK}>
                {name}
              </a>
              <span aria-hidden="true">/</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function RelatedLinks({
  locale,
  pages,
  names,
  labels,
}: {
  locale: Locale;
  pages: readonly PageId[];
  names: Names;
  labels: ServicePageLabels;
}) {
  return (
    <section
      aria-labelledby="related-title"
      className="border-t border-hairline"
    >
      <Container className="py-7 md:py-14">
        <h2 id="related-title" className="text-h2-compact">
          {labels.related}
        </h2>
        <ul className="related-links">
          {[
            ...pages.map((target) => ({
              href: pagePath(locale, target),
              name: crumbName(names, target),
            })),
            { href: pagePath(locale, 'services'), name: labels.allServices },
          ].map(({ href, name }) => (
            <li key={href}>
              <a href={href} className="hover-line font-medium">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
