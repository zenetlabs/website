import { Fragment } from 'react';
import { CompanyMark } from '@/components/companies-strip';
import type { CompanyCopy } from '@/content/types';
import { PORTFOLIO } from '@/lib/portfolio';

// The companies we run as one white sheet: a row per company with its real
// logo, its category and, from `lg`, what it does. Each row is a link to the
// company's own site.
export function CompanySheet({
  title,
  lead,
  companies,
}: {
  title: string;
  lead?: string;
  companies: CompanyCopy;
}) {
  return (
    <div>
      <h2 id="companies-title" className="text-ui-l font-medium text-fg-soft">
        {title}
      </h2>
      <ul className="company-sheet mt-3 divide-y divide-hairline">
        {PORTFOLIO.map(({ key, name, href, logo }) => (
          <li key={key}>
            <a href={href} className="company-row">
              <span className="company-row-logo">
                <CompanyMark name={name} logo={logo} />
              </span>
              <span className="company-row-category">
                {companies[key].category.split(' · ').map((part, index) => (
                  <Fragment key={part}>
                    {index > 0 ? ' ' : null}
                    <span>{part}</span>
                  </Fragment>
                ))}
              </span>
              <span className="company-row-text">
                {companies[key].description}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {lead ? <p className="mt-4 text-ui-s text-muted-fg">{lead}</p> : null}
    </div>
  );
}
