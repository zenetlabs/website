import type { ReactNode } from 'react';
import { FEATURED_BADGE, H3 } from '@/components/ui';

export function ServiceRow({
  href,
  name,
  summary,
  price,
  heading: Heading = 'h3',
  featured,
  dense,
}: {
  href: string;
  name: string;
  summary: string;
  price: string;
  heading?: 'h2' | 'h3';
  featured?: { badge: string; action: ReactNode };
  dense?: boolean;
}) {
  return (
    <li
      className={`border-b border-hairline ${featured ? '-mx-4 bg-highlight-soft px-4 md:-mx-6 md:px-6' : ''}`}
    >
      <a
        href={href}
        className={`service-row group ${dense ? 'service-row-dense' : ''}`}
      >
        {featured ? (
          <span className="basis-full md:col-span-full">
            <span className={FEATURED_BADGE}>{featured.badge}</span>
          </span>
        ) : null}
        <Heading
          className={`${H3} underline decoration-transparent underline-offset-4 pointer-fine:group-hover:decoration-fg md:col-span-4`}
        >
          {name}
        </Heading>
        <p className="service-summary">{summary}</p>
        <p
          className={`order-2 font-semibold md:order-none md:col-span-3 md:text-right ${featured ? 'text-lg md:text-xl' : 'text-ui-s md:text-ui-m'}`}
        >
          {price}
        </p>
      </a>
      {featured?.action}
    </li>
  );
}
