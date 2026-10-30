import { Container } from '@/components/section';
import { EYEBROW } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import { PORTFOLIO } from '@/lib/portfolio';

export function CompaniesStrip({ copy }: { copy: HomeContent['companies'] }) {
  return (
    <section
      id="companies"
      aria-labelledby="companies-title"
      className="border-t border-hairline"
    >
      <Container className="py-10 md:py-12">
        <h2 id="companies-title" className={EYEBROW}>
          {copy.title}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          {PORTFOLIO.map(({ key, name, href }) => (
            <li key={key}>
              <a
                href={href}
                className="group flex flex-col gap-1 rounded-input motion-safe:transition-colors motion-safe:duration-200"
              >
                <span className="font-display text-2xl leading-tight underline decoration-hairline underline-offset-4 group-hover:decoration-fg">
                  {name}
                </span>
                <span className="font-mono text-xs text-muted-fg">
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
